import { z } from "zod";

import { HttpError, getErrorStatus } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

import { getGeminiClient, normalizeModelName } from "./client";
import { parseDataUrl } from "./data-url";
import { fetchUrlAsBase64 } from "./fetch-base64";
import { DEFAULT_GEMINI_OCR_MODEL, GEMINI_ASSISTANT_MODEL, GEMINI_IMAGE_MODEL, GEMINI_OCR_MODEL } from "./models";
import { stripJsonFences } from "./text";

const extractTextBlocksSchema = z.object({
  blocks: z.array(z.unknown()).default([]),
});

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
  if (typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
    return (error as any).message;
  }
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

