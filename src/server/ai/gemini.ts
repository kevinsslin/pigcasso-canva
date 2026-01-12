import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { HttpError, getErrorStatus } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";
import { pickGeminiAspectRatio, type CanvasSize } from "@/server/gemini-image-config";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

export type AiProvider = "gemini";
export type NanoBananaProfile = "nano-banana" | "nano-banana-pro";

const normalizeModelName = (model: string) => model.trim();

let cachedGeminiClient: GoogleGenAI | null = null;

const getGeminiClient = () => {
  if (cachedGeminiClient) {
    return cachedGeminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "AI is currently unavailable.", { expose: true });
  }

  cachedGeminiClient = new GoogleGenAI({ apiKey });
  return cachedGeminiClient;
};

const GEMINI_ASSISTANT_MODEL =
  normalizeModelName(process.env.GEMINI_ASSISTANT_MODEL ?? "") ||
  "gemini-3-pro-preview";

const GEMINI_IMAGE_MODEL =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL ?? "") ||
  "gemini-2.5-flash-image-preview";

// Used for structured vision outputs (OCR, layout extraction). Must support JSON-mode.
const DEFAULT_GEMINI_OCR_MODEL = "gemini-2.0-flash";
const GEMINI_OCR_MODEL =
  normalizeModelName(process.env.GEMINI_OCR_MODEL ?? "") ||
  DEFAULT_GEMINI_OCR_MODEL;

const GEMINI_IMAGE_MODEL_NANO_BANANA =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL_NANO_BANANA ?? "") || "";

const GEMINI_IMAGE_MODEL_NANO_BANANA_PRO =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL_NANO_BANANA_PRO ?? "") || "";

const pickGeminiImageModel = (profile?: NanoBananaProfile) => {
  if (profile === "nano-banana-pro") {
    return GEMINI_IMAGE_MODEL_NANO_BANANA_PRO || GEMINI_IMAGE_MODEL_NANO_BANANA || GEMINI_IMAGE_MODEL;
  }
  if (profile === "nano-banana") {
    return GEMINI_IMAGE_MODEL_NANO_BANANA || GEMINI_IMAGE_MODEL;
  }
  return GEMINI_IMAGE_MODEL;
};

type GeminiInlineImage = {
  data: string;
  mimeType: string;
};

type GeminiInlineData = {
  data?: unknown;
  mimeType?: unknown;
};

type GeminiPart = {
  inlineData?: GeminiInlineData;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

const extractInlineImage = (response: unknown): GeminiInlineImage | null => {
  const parts = (response as GeminiResponse)?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    const inlineData = part?.inlineData;
    if (!inlineData) {
      continue;
    }

    if (typeof inlineData.data === "string" && inlineData.data.length > 0) {
      return {
        data: inlineData.data,
        mimeType:
          typeof inlineData.mimeType === "string" ? inlineData.mimeType : "image/png",
      };
    }
  }

  return null;
};

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    base64: match[2],
  };
};

const MAX_REMOTE_IMAGE_BYTES = 15_000_000;

const fetchUrlAsBase64 = async (input: string) => {
  const remote = assertSafeRemoteUrl(input, "Invalid image URL");

  const res = await fetch(remote.toString());
  assertSafeRemoteUrl(res.url, "Invalid image URL");
  if (!res.ok) {
    throw new HttpError(502, `Failed to fetch image: ${res.status}`, { expose: true });
  }

  const contentLengthRaw = res.headers.get("content-length");
  if (contentLengthRaw) {
    const contentLength = Number(contentLengthRaw);
    if (Number.isFinite(contentLength) && contentLength > MAX_REMOTE_IMAGE_BYTES) {
      throw new HttpError(413, "Image too large");
    }
  }

  const mimeType = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new HttpError(413, "Image too large");
  }

  return {
    mimeType,
    base64: buf.toString("base64"),
  };
};

const toDataUrl = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isRetryableImageError = (error: HttpError) => {
  return (
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
};

const getRetryDelayMs = (attemptIndex: number) => {
  const base = 400;
  return base * attemptIndex;
};

export const generateImage = async (params: {
  prompt: string;
  canvas?: CanvasSize;
  profile?: NanoBananaProfile;
}) => {
  const ai = getGeminiClient();
  const model = pickGeminiImageModel(params.profile);

  const aspectRatio = pickGeminiAspectRatio(params.canvas);

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model,
        contents: params.prompt,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: aspectRatio
            ? {
                aspectRatio,
              }
            : undefined,
        },
      });
    } catch (error) {
      const normalized = normalizeGeminiError(error, {
        model,
        operation: "generateImage",
      });
      if (attempt < maxAttempts && isRetryableImageError(normalized)) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw normalized;
    }

    const image = extractInlineImage(response);
    if (!image) {
      const noImageError = new HttpError(502, "No image generated", { expose: true });
      if (attempt < maxAttempts) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw noImageError;
    }

    return {
      imageUrl: toDataUrl(image.mimeType, image.data),
      provider: "gemini" as const,
    };
  }

  throw new HttpError(502, "No image generated", { expose: true });
};

export const removeBackground = async (params: { image: string }) => {
  const ai = getGeminiClient();
  const model = pickGeminiImageModel("nano-banana");

  const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [
          { text: "Remove the background and return a transparent PNG." },
          {
            inlineData: {
              mimeType: inline.mimeType,
              data: inline.base64,
            },
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
        },
      });
    } catch (error) {
      const normalized = normalizeGeminiError(error, {
        model,
        operation: "removeBackground",
      });
      if (attempt < maxAttempts && isRetryableImageError(normalized)) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw normalized;
    }

    const image = extractInlineImage(response);
    if (!image) {
      const noImageError = new HttpError(502, "No image generated", { expose: true });
      if (attempt < maxAttempts) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw noImageError;
    }

    return {
      imageUrl: toDataUrl(image.mimeType, image.data),
      provider: "gemini" as const,
    };
  }

  throw new HttpError(502, "No image generated", { expose: true });
};

export const editImage = async (params: {
  image: string;
  instruction: string;
  referenceImages?: string[];
  canvas?: CanvasSize;
  profile?: NanoBananaProfile;
}) => {
  const ai = getGeminiClient();
  const model = pickGeminiImageModel(params.profile);

  const base = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));
  const references = await Promise.all(
    (params.referenceImages ?? []).slice(0, 4).map(async (input) => {
      return parseDataUrl(input) ?? (await fetchUrlAsBase64(input));
    }),
  );

  const aspectRatio = pickGeminiAspectRatio(params.canvas);
  const prompt = [
    "Edit the provided image according to the instruction.",
    "Keep everything else as consistent as possible.",
    params.instruction.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
    {
      inlineData: {
        mimeType: base.mimeType,
        data: base.base64,
      },
    },
    ...references.map((ref) => ({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.base64,
      },
    })),
  ];

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: aspectRatio
            ? {
                aspectRatio,
              }
            : undefined,
        },
      });
    } catch (error) {
      const normalized = normalizeGeminiError(error, {
        model,
        operation: "editImage",
      });
      if (attempt < maxAttempts && isRetryableImageError(normalized)) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw normalized;
    }

    const image = extractInlineImage(response);
    if (!image) {
      const noImageError = new HttpError(502, "No image generated", { expose: true });
      if (attempt < maxAttempts) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw noImageError;
    }

    return {
      imageUrl: toDataUrl(image.mimeType, image.data),
      provider: "gemini" as const,
    };
  }

  throw new HttpError(502, "No image generated", { expose: true });
};

const stripCodeFences = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1].trim() : trimmed;
};

export const generateHtml = async (params: { prompt: string }) => {
  const ai = getGeminiClient();
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are an expert front-end engineer and designer.
Return a SINGLE self-contained HTML document (no markdown, no code fences).
Constraints:
- Must start with <!doctype html> and include <html>, <head>, and <body>.
- Inline CSS only (no external stylesheets).
- NO external network requests: no <script src>, no <link rel="stylesheet" href>, no external images, no external fonts, no CDNs.
- Use system fonts only.
- Use a LIGHT background (prefer #F3F4F5 or white) and high-contrast text (prefer #111827).
- Avoid dark/black full-screen backgrounds unless explicitly requested.
- Ensure the layout is immediately visible (no blank screens; no relying on external JS).
- Make it responsive, modern, and readable.
`.trim();

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model,
      contents: params.prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: 2000,
        temperature: 0.6,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model,
      operation: "generateHtml",
    });
  }

  const text =
    typeof (response as { text?: unknown })?.text === "string"
      ? ((response as { text?: string }).text ?? "").trim()
      : "";

  const html = stripCodeFences(text);
  if (!html) {
    throw new HttpError(502, "No HTML generated", { expose: true });
  }

  return { html, provider: "gemini" as const };
};

export const chatAssistant = async (params: { prompt: string }) => {
  const ai = getGeminiClient();
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are Pigcasso, an AI design partner.
Respond with plain text (no markdown, no code fences).
Be concise by default; ask clarifying questions when needed.
`.trim();

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model,
      contents: params.prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: 1200,
        temperature: 0.7,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model,
      operation: "chatAssistant",
    });
  }

  const text =
    typeof (response as { text?: unknown })?.text === "string"
      ? ((response as { text?: string }).text ?? "").trim()
      : "";

  if (!text) {
    throw new HttpError(502, "No response generated", { expose: true });
  }

  return { text, provider: "gemini" as const };
};

export const getAssistantModel = () => GEMINI_ASSISTANT_MODEL;

const analyzeCanvasPromptSchema = z.discriminatedUnion("route", [
  z.object({
    route: z.literal("generate_image"),
    prompt: z.string().trim().min(1).max(6000),
  }),
  z.object({
    route: z.literal("generate_html"),
    prompt: z.string().trim().min(1).max(6000),
  }),
  z.object({
    route: z.literal("edit_selected_image"),
    instruction: z.string().trim().min(1).max(2000),
  }),
  z.object({
    route: z.literal("ask_clarify"),
    question: z.string().trim().min(1).max(1200),
  }),
]);

export type AnalyzeCanvasPromptResult = z.infer<typeof analyzeCanvasPromptSchema>;

const parseAnalyzeCanvasPromptResponse = (text: string): AnalyzeCanvasPromptResult => {
  const trimmed = stripJsonFences(text);
  if (!trimmed) {
    throw new HttpError(502, "No analysis generated", { expose: true });
  }

  const candidate = (() => {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    return trimmed;
  })();

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new HttpError(502, "AI returned invalid JSON", { expose: true });
  }

  const validated = analyzeCanvasPromptSchema.safeParse(parsed);
  if (!validated.success) {
    throw new HttpError(502, "AI returned an invalid plan", { expose: true });
  }

  return validated.data;
};

const fallbackAnalyzeCanvasPrompt = (params: {
  prompt: string;
  selectionType?: string | null;
  hasContext?: boolean;
}): AnalyzeCanvasPromptResult => {
  const prompt = params.prompt.trim();
  const lowered = prompt.toLowerCase();
  const selectionType = (params.selectionType ?? "").toLowerCase();

  const wantsHtml =
    /\bhtml\b/.test(lowered) ||
    lowered.includes("landing page") ||
    lowered.includes("website") ||
    lowered.includes("web page") ||
    lowered.includes("homepage");

  if (wantsHtml) {
    return { route: "generate_html", prompt };
  }

  const hasImageSelected = selectionType === "image";
  const looksLikeEdit =
    hasImageSelected &&
    (/\bedit\b/.test(lowered) ||
      lowered.includes("remove background") ||
      lowered.includes("remove bg") ||
      lowered.includes("change text") ||
      lowered.includes("fix text") ||
      lowered.includes("swap") ||
      lowered.includes("replace") ||
      lowered.includes("retouch") ||
      lowered.includes("cleanup") ||
      lowered.includes("color"));

  if (looksLikeEdit) {
    return { route: "edit_selected_image", instruction: prompt };
  }

  const tooVague =
    prompt.length < 18 &&
    !wantsHtml &&
    !hasImageSelected &&
    (lowered.includes("make it") || lowered.includes("improve") || lowered.includes("better"));

  if (tooVague && !params.hasContext) {
    return { route: "ask_clarify", question: "What should I create? (e.g. image, landing page HTML, or an edit to a selected image)" };
  }

  return { route: "generate_image", prompt };
};

export const analyzeCanvasPrompt = async (params: {
  prompt: string;
  context?: string | null;
  selection?: { type: string; label?: string | null } | null;
}): Promise<{ data: AnalyzeCanvasPromptResult; provider: AiProvider }> => {
  const ai = getGeminiClient();
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are Pigcasso's planner/router for an infinite canvas design tool.
Return a SINGLE JSON object (no markdown, no code fences) matching EXACTLY one of these shapes:

1) {"route":"generate_image","prompt":"..."}
2) {"route":"generate_html","prompt":"..."}
3) {"route":"edit_selected_image","instruction":"..."}  (only if the current selection is an image AND the user request is to modify it)
4) {"route":"ask_clarify","question":"..."}  (if the request is ambiguous / missing key details)

Rules:
- Prefer "generate_html" when the user asks for a webpage / landing page / HTML.
- Prefer "edit_selected_image" when an image is selected and the user asks to change that image (remove background, fix text, recolor, etc).
- Otherwise prefer "generate_image".
- Keep prompts concise but specific (style + subject + key constraints).
- For HTML prompts: keep it self-contained (no external assets, no external fonts, no CDNs), and default to a light background (#F3F4F5 or white).
`.trim();

  const inputPayload = {
    prompt: params.prompt.trim(),
    selection: params.selection
      ? { type: params.selection.type, label: params.selection.label ?? null }
      : { type: "none", label: null },
    context: params.context?.trim() ? params.context.trim() : null,
  };

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model,
      contents: JSON.stringify(inputPayload),
      config: {
        systemInstruction: system,
        maxOutputTokens: 550,
        temperature: 0.2,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model,
      operation: "analyzeCanvasPrompt",
    });
  }

  const text =
    typeof (response as { text?: unknown })?.text === "string"
      ? ((response as { text?: string }).text ?? "").trim()
      : "";

  const data = (() => {
    try {
      return parseAnalyzeCanvasPromptResponse(text);
    } catch {
      return fallbackAnalyzeCanvasPrompt({
        prompt: params.prompt,
        selectionType: params.selection?.type ?? null,
        hasContext: Boolean(params.context?.trim()),
      });
    }
  })();

  return { data, provider: "gemini" as const };
};

const extractTextBlocksSchema = z.object({
  blocks: z.array(z.unknown()).default([]),
});

const stripJsonFences = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1].trim() : trimmed;
};

export const parseExtractTextBlocksResponse = (text: string) => {
  const trimmed = stripJsonFences(text);
  if (!trimmed) {
    throw new HttpError(502, "No text extracted", { expose: true });
  }

  const candidate = (() => {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    return trimmed;
  })();

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new HttpError(502, "AI returned invalid JSON", { expose: true });
  }

  const normalizeCoord = (value: unknown) => {
    const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(num)) return null;

    const normalized = num > 1 && num <= 100 ? num / 100 : num;
    if (!Number.isFinite(normalized)) return null;

    return Math.min(1, Math.max(0, normalized));
  };

  const normalizeAngle = (value: unknown) => {
    const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isFinite(num)) return undefined;

    const normalized = ((((num % 360) + 360) % 360) + 180) % 360 - 180;
    if (!Number.isFinite(normalized)) return undefined;

    return Number(normalized.toFixed(2));
  };

  const allowedFont = z.enum(["draw", "sans", "serif", "mono"]);
  const allowedSize = z.enum(["s", "m", "l", "xl"]);
  const allowedColor = z.enum(["black", "white", "grey", "red", "orange", "yellow", "green", "blue", "violet"]);
  const allowedAlign = z.enum(["start", "middle", "end"]);

  const rawResult = extractTextBlocksSchema.safeParse(parsed);
  if (!rawResult.success) {
    throw new HttpError(502, "AI returned an unexpected text extraction format", { expose: true });
  }

  const blocks = (rawResult.data.blocks ?? [])
    .map((block) => {
      const textValue = typeof (block as any)?.text === "string" ? String((block as any).text).trim() : "";
      if (!textValue) return null;

      const box = (block as any)?.box ?? {};
      const x = normalizeCoord(box.x);
      const y = normalizeCoord(box.y);
      const w = normalizeCoord(box.w);
      const h = normalizeCoord(box.h);
      if (x === null || y === null || w === null || h === null) return null;

      const angle = normalizeAngle((block as any)?.angle);
      const font = allowedFont.safeParse((block as any)?.font).success ? (block as any).font : undefined;
      const size = allowedSize.safeParse((block as any)?.size).success ? (block as any).size : undefined;
      const color = allowedColor.safeParse((block as any)?.color).success ? (block as any).color : undefined;
      const align = allowedAlign.safeParse((block as any)?.align).success ? (block as any).align : undefined;

      return {
        text: textValue,
        box: { x, y, w, h },
        angle,
        font,
        size,
        color,
        align,
      };
    })
    .filter(Boolean)
    .slice(0, 40);

  return { blocks };
};

const extractErrorMessage = (error: unknown) => {
  if (!error) return "";
  if (error instanceof Error && typeof error.message === "string") return error.message;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "";
};

const isJsonModeNotEnabledError = (error: unknown) => {
  const message = extractErrorMessage(error).toLowerCase();
  if (!message.includes("json mode is not enabled")) return false;
  const status = getErrorStatus(error);
  return status === undefined || status === 400;
};

export const extractTextBlocks = async (params: { image: string }) => {
  const ai = getGeminiClient();

  const responseJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: ["blocks"],
    properties: {
      blocks: {
        type: "array",
        items: {
          type: "object",
          required: ["text", "box"],
          properties: {
            text: { type: "string" },
            box: {
              type: "object",
              additionalProperties: false,
              required: ["x", "y", "w", "h"],
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                w: { type: "number" },
                h: { type: "number" },
              },
            },
            angle: { type: "number" },
            font: { type: "string", enum: ["draw", "sans", "serif", "mono"] },
            size: { type: "string", enum: ["s", "m", "l", "xl"] },
            color: {
              type: "string",
              enum: ["black", "white", "grey", "red", "orange", "yellow", "green", "blue", "violet"],
            },
            align: { type: "string", enum: ["start", "middle", "end"] },
          },
        },
      },
    },
  } as const;

  const system = `
You are a vision OCR + layout analyzer.
Return ONLY valid JSON. No markdown. No code fences.
Schema:
{
  "blocks": [
    {
      "text": "string",
      "box": { "x": 0-1, "y": 0-1, "w": 0-1, "h": 0-1 },
      "angle": -180-180,
      "font": "draw|sans|serif|mono",
      "size": "s|m|l|xl",
      "color": "black|white|grey|red|orange|yellow|green|blue|violet",
      "align": "start|middle|end"
    }
  ]
}
Rules:
- Only include text that is visibly present in the image.
- Keep the exact wording and line breaks.
- Coordinates are normalized to the full image (top-left origin).
- "angle" is the block rotation in degrees (clockwise), 0 means horizontal.
- Group words into sensible blocks (usually lines/phrases), not per-character.
- Keep blocks in reading order top-to-bottom.
- Max 40 blocks.
`.trim();

  const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

  const candidates = Array.from(
    new Set(
      [GEMINI_OCR_MODEL, DEFAULT_GEMINI_OCR_MODEL, GEMINI_ASSISTANT_MODEL, GEMINI_IMAGE_MODEL]
        .map(normalizeModelName)
        .filter(Boolean),
    ),
  );

  let lastError: unknown = null;
  let lastModel = candidates[0] ?? GEMINI_OCR_MODEL;

  const run = async (model: string, useJsonMode: boolean) => {
    const config = {
      responseModalities: ["TEXT"],
      systemInstruction: system,
      maxOutputTokens: 1800,
      temperature: 0,
      ...(useJsonMode
        ? { responseMimeType: "application/json" as const, responseJsonSchema }
        : null),
    };

    return ai.models.generateContent({
      model,
      contents: [
        { text: "Extract all text blocks from this image." },
        { inlineData: { mimeType: inline.mimeType, data: inline.base64 } },
      ],
      config,
    });
  };

  for (const model of candidates) {
    lastModel = model;

    try {
      const response = await run(model, true);
      const text =
        typeof (response as { text?: unknown })?.text === "string"
          ? ((response as { text?: string }).text ?? "").trim()
          : "";
      const parsed = parseExtractTextBlocksResponse(text);
      return { ...parsed, provider: "gemini" as const };
    } catch (error) {
      lastError = error;

      if (isJsonModeNotEnabledError(error)) {
        try {
          const response = await run(model, false);
          const text =
            typeof (response as { text?: unknown })?.text === "string"
              ? ((response as { text?: string }).text ?? "").trim()
              : "";
          const parsed = parseExtractTextBlocksResponse(text);
          return { ...parsed, provider: "gemini" as const };
        } catch (fallbackError) {
          lastError = fallbackError;
          continue;
        }
      }

      continue;
    }
  }

  if (lastError instanceof HttpError) {
    throw lastError;
  }
  throw normalizeGeminiError(lastError, {
    model: lastModel,
    operation: "extractTextBlocks",
  });

  // Unreachable
};
