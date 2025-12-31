import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { GoogleGenAI } from "@google/genai";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { presentationDecks, presentationSlides, projects } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { normalizeGeminiError } from "@/server/ai-errors";
import { HttpError } from "@/server/http-error";
import { getAssistantModel } from "@/server/ai-providers";

const parseJsonObject = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const themeSchema = z.object({
  background: z.string().trim().min(1).max(64),
  surface: z.string().trim().min(1).max(64),
  text: z.string().trim().min(1).max(64),
  primary: z.string().trim().min(1).max(64),
  secondary: z.string().trim().min(1).max(64),
  accent: z.string().trim().min(1).max(64),
  fontFamily: z.string().trim().min(1).max(64),
});

const slideSchema = z.object({
  layout: z.enum(["title", "bullets", "quote", "diagram"]),
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(160).optional(),
  bullets: z.array(z.string().trim().min(1).max(120)).max(6).optional(),
  speakerNotes: z.string().trim().max(280).optional(),
});

const deckSpecSchema = z.object({
  title: z.string().trim().min(1).max(80),
  theme: themeSchema,
  slides: z.array(slideSchema).min(3).max(10),
});

type DeckSpec = z.infer<typeof deckSpecSchema>;

const buildDeckJsonSchema = (slideCount: number) => ({
  type: "object",
  additionalProperties: false,
  required: ["title", "theme", "slides"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 80 },
    theme: {
      type: "object",
      additionalProperties: false,
      required: [
        "background",
        "surface",
        "text",
        "primary",
        "secondary",
        "accent",
        "fontFamily",
      ],
      properties: {
        background: { type: "string" },
        surface: { type: "string" },
        text: { type: "string" },
        primary: { type: "string" },
        secondary: { type: "string" },
        accent: { type: "string" },
        fontFamily: { type: "string" },
      },
    },
    slides: {
      type: "array",
      minItems: slideCount,
      maxItems: slideCount,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["layout", "title"],
        properties: {
          layout: { type: "string", enum: ["title", "bullets", "quote", "diagram"] },
          title: { type: "string", minLength: 1, maxLength: 80 },
          subtitle: { type: "string", maxLength: 160 },
          bullets: {
            type: "array",
            items: { type: "string", maxLength: 120 },
            minItems: 0,
            maxItems: 6,
          },
          speakerNotes: { type: "string", maxLength: 280 },
        },
      },
    },
  },
});

const normalizeDeck = (deck: DeckSpec, slideCount: number): DeckSpec => {
  const slides = deck.slides.slice(0, slideCount);

  while (slides.length < slideCount) {
    slides.push({
      layout: "bullets",
      title: `Slide ${slides.length + 1}`,
      bullets: ["Add your key point here."],
    });
  }

  if (slides.length && slides[0].layout !== "title") {
    slides[0] = {
      ...slides[0],
      layout: "title",
    };
  }

  return { ...deck, slides };
};

const generateSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  audience: z.string().trim().max(120).optional(),
  slideCount: z.coerce.number().int().min(3).max(10).default(6),
  tone: z.enum(["professional", "friendly", "bold"]).default("professional"),
  language: z.enum(["en", "zh"]).optional(),
});

const createDeckSchema = z.object({
  title: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(1).max(2000),
  spec: z.unknown(),
  slides: z
    .array(
      z.object({
        projectId: z.string().trim().min(1),
        index: z.number().int().min(0).max(50),
        title: z.string().trim().min(1).max(80),
      }),
    )
    .min(1)
    .max(20),
});

const listDecksSchema = z.object({
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(50),
});

const app = new Hono()
  .post("/generate", requireAuth, zValidator("json", generateSchema), async (c) => {
    const { topic, audience, slideCount, tone, language } = c.req.valid("json");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(501, "AI is currently unavailable.");
    }

    const model = (process.env.GEMINI_PRESENTATION_MODEL ?? "").trim() || getAssistantModel();

    const wantsZh =
      language === "zh" || (language !== "en" && /[\u4e00-\u9fff]/.test(topic));

    const systemInstruction = `
You are an AI presentation generator (similar to Gamma).
Return ONLY valid JSON matching the provided schema.

Goal: Generate a slide deck outline with a cohesive theme (colors + font).

Rules:
- Output language: ${wantsZh ? "Chinese (Traditional)" : "English"}.
- Tone: ${tone}.
- Slide count: EXACTLY ${slideCount} slides.
- Keep slide text short and scannable.
- Use these layouts across the deck: title, bullets, quote, diagram.
- First slide MUST be layout="title".

Theme requirements:
- Pick a light background for readability.
- Provide CSS-like colors (e.g. #RRGGBB or rgb()).
- Choose a widely available fontFamily (e.g. "Nunito", "Inter", "Arial").
`.trim();

    const userPrompt = [
      `Topic: ${topic}`,
      audience ? `Audience: ${audience}` : null,
      "Generate a deck outline and theme.",
    ]
      .filter(Boolean)
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });

    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model,
        contents: {
          role: "user",
          parts: [{ text: userPrompt }],
        },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: buildDeckJsonSchema(slideCount),
          maxOutputTokens: 1400,
          temperature: 0.7,
        },
      });
    } catch (error) {
      throw normalizeGeminiError(error, { model, operation: "generatePresentation" });
    }

    const text =
      typeof (response as { text?: unknown })?.text === "string"
        ? ((response as { text?: string }).text ?? "").trim()
        : "";

    const parsed = text ? parseJsonObject(text) : null;
    const validated = parsed ? deckSpecSchema.safeParse(parsed) : null;

    if (!validated?.success) {
      return c.json(
        {
          error: "Failed to generate a deck. Please try a simpler topic.",
        },
        502,
      );
    }

    return c.json({
      data: normalizeDeck(validated.data, slideCount),
    });
  })
  .post("/", requireAuth, zValidator("json", createDeckSchema), async (c) => {
    const auth = c.get("authUser");
    const { title, prompt, spec, slides } = c.req.valid("json");

    const projectIds = slides.map((slide) => slide.projectId);
    const owned = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.userId, auth.id), inArray(projects.id, projectIds)));

    if (owned.length !== projectIds.length) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const now = new Date();
    const specString = JSON.stringify(spec);

    const [deck] = await db
      .insert(presentationDecks)
      .values({
        userId: auth.id,
        title,
        prompt,
        spec: specString,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!deck) {
      return c.json({ error: "Failed to create deck" }, 400);
    }

    const slideRows = slides
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((slide) => ({
        deckId: deck.id,
        projectId: slide.projectId,
        index: slide.index,
        title: slide.title,
        createdAt: now,
      }));

    await db.insert(presentationSlides).values(slideRows);

    return c.json({ data: { deckId: deck.id } });
  })
  .get(
    "/",
    requireAuth,
    zValidator("query", listDecksSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { page, limit } = c.req.valid("query");

      const rows = await db
        .select({
          id: presentationDecks.id,
          title: presentationDecks.title,
          prompt: presentationDecks.prompt,
          createdAt: presentationDecks.createdAt,
          updatedAt: presentationDecks.updatedAt,
        })
        .from(presentationDecks)
        .where(eq(presentationDecks.userId, auth.id))
        .orderBy(desc(presentationDecks.updatedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return c.json({
        data: rows,
        nextPage: rows.length === limit ? page + 1 : null,
      });
    },
  )
  .get(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const [deck] = await db
        .select()
        .from(presentationDecks)
        .where(and(eq(presentationDecks.id, id), eq(presentationDecks.userId, auth.id)));

      if (!deck) {
        return c.json({ error: "Not found" }, 404);
      }

      const slides = await db
        .select({
          id: presentationSlides.id,
          index: presentationSlides.index,
          title: presentationSlides.title,
          project: {
            id: projects.id,
            name: projects.name,
            width: projects.width,
            height: projects.height,
            thumbnailUrl: projects.thumbnailUrl,
            updatedAt: projects.updatedAt,
          },
        })
        .from(presentationSlides)
        .innerJoin(projects, eq(presentationSlides.projectId, projects.id))
        .where(eq(presentationSlides.deckId, deck.id))
        .orderBy(asc(presentationSlides.index));

      let parsedSpec: unknown = null;
      try {
        parsedSpec = JSON.parse(deck.spec);
      } catch {
        parsedSpec = deck.spec;
      }

      return c.json({
        data: {
          deck: {
            id: deck.id,
            title: deck.title,
            prompt: deck.prompt,
            spec: parsedSpec,
            createdAt: deck.createdAt,
            updatedAt: deck.updatedAt,
          },
          slides,
        },
      });
    },
  );

export default app;

