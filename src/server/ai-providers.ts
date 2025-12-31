import { GoogleGenAI } from "@google/genai";

import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

export type AiProvider = "gemini";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "AI is currently unavailable.");
  }
  return new GoogleGenAI({ apiKey });
};

const GEMINI_ASSISTANT_MODEL =
  process.env.GEMINI_ASSISTANT_MODEL?.trim() || "gemini-3-pro";

const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-nano-banana";

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

const fetchUrlAsBase64 = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }

  const mimeType = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());

  return {
    mimeType,
    base64: buf.toString("base64"),
  };
};

const toDataUrl = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

export const generateImage = async (params: { prompt: string }) => {
  const ai = getGeminiClient();

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: params.prompt,
    });
  } catch (error) {
    throw normalizeGeminiError(error);
  }

  const image = extractInlineImage(response);
  if (!image) {
    throw new HttpError(502, "No image generated");
  }

  return { imageUrl: toDataUrl(image.mimeType, image.data), provider: "gemini" as const };
};

export const removeBackground = async (params: { image: string }) => {
  const ai = getGeminiClient();

  const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [
        { text: "Remove the background and return a transparent PNG." },
        {
          inlineData: {
            mimeType: inline.mimeType,
            data: inline.base64,
          },
        },
      ],
    });
  } catch (error) {
    throw normalizeGeminiError(error);
  }

  const image = extractInlineImage(response);
  if (!image) {
    throw new HttpError(502, "No image generated");
  }

  return { imageUrl: toDataUrl(image.mimeType, image.data), provider: "gemini" as const };
};

export const getAssistantModel = () => GEMINI_ASSISTANT_MODEL;

