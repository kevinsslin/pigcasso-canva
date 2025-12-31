import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { GoogleGenAI } from "@google/genai";

import { requireAuth } from "@/server/hono-auth";
import { normalizeGeminiError } from "@/server/ai-errors";
import { HttpError } from "@/server/http-error";

const inputSchema = z.object({
  input: z.string().trim().min(1).max(2000),
});

const templateSchema = z.enum(["ama", "announcement", "event-banner"]);
const variantSchema = z.enum(["centered", "split", "diagonal"]);

const contentSchema = z
  .object({
    title: z.string().trim().max(120).optional(),
    subtitle: z.string().trim().max(160).optional(),
    datetime: z.string().trim().max(80).optional(),
    cta: z.string().trim().max(80).optional(),
  })
  .partial();

const pendingActionSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("align"),
      mode: z.enum(["center", "left", "right", "top", "bottom"]),
    }),
    z.object({
      type: z.literal("textHierarchy"),
    }),
    z.object({
      type: z.literal("template"),
      template: templateSchema,
      variant: variantSchema,
      content: contentSchema.optional(),
    }),
    z.object({
      type: z.literal("variants"),
      template: templateSchema,
      content: contentSchema.optional(),
    }),
  ])
  .nullable();

const responseSchema = z.object({
  reply: z.string().trim().min(1).max(800),
  action: pendingActionSchema,
});

const extractJson = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

const app = new Hono().post(
  "/action",
  requireAuth,
  zValidator("json", inputSchema),
  async (c) => {
    const { input } = c.req.valid("json");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpError(501, "Assistant is currently unavailable.");
    }

    const model =
      process.env.GEMINI_ASSISTANT_MODEL?.trim() || "gemini-2.5-pro";

    const ai = new GoogleGenAI({ apiKey });

    const system = `
You are Pigcasso Assistant inside a web-based canvas editor.
Your job: interpret the user's message and suggest ONE action that the editor can apply.

You MUST return ONLY valid JSON (no markdown, no code fences) matching this schema:
{
  "reply": string,
  "action": null
    | { "type": "align", "mode": "center"|"left"|"right"|"top"|"bottom" }
    | { "type": "textHierarchy" }
    | { "type": "template", "template": "ama"|"announcement"|"event-banner", "variant": "centered"|"split"|"diagonal", "content"?: { "title"?: string, "subtitle"?: string, "datetime"?: string, "cta"?: string } }
    | { "type": "variants", "template": "ama"|"announcement"|"event-banner", "content"?: { "title"?: string, "subtitle"?: string, "datetime"?: string, "cta"?: string } }
}

Rules:
- If the user asks for "3 variants / 三個版本 / 版本", use type "variants".
- If the user asks for a specific layout ("AMA", "announcement/公告", "event/banner/活動") use type "template" with a best-fit variant.
- If the user asks for alignment (置中/置頂/置底/左對齊/右對齊), use type "align".
- If the user asks to set title/subtitle/cta hierarchy or make text hierarchy better, use type "textHierarchy".
- If the request is unrelated or unclear, return action=null and ask a short clarification.
- Keep reply short, friendly, and in the user's language (Chinese if user wrote Chinese).
`.trim();

    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [
          { text: system },
          { text: input },
        ],
        config: {
          maxOutputTokens: 350,
          responseMimeType: "application/json",
        },
      });
    } catch (error) {
      throw normalizeGeminiError(error);
    }

    const text =
      typeof (response as { text?: unknown })?.text === "string"
        ? ((response as { text?: string }).text ?? "").trim()
        : "";

    const parsed = text ? extractJson(text) : null;
    const validated = parsed ? responseSchema.safeParse(parsed) : null;

    if (validated?.success) {
      return c.json({ data: validated.data });
    }

    return c.json({
      data: {
        reply: text || "我還不太確定要怎麼做，你可以再說清楚一點嗎？",
        action: null,
      },
    });
  },
);

export default app;
