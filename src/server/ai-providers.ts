import { GoogleGenAI } from "@google/genai";

import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

export type AiProvider = "gemini";

const normalizeModelName = (model: string) => model.trim();

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "AI is currently unavailable.");
  }
  return new GoogleGenAI({ apiKey });
};

const GEMINI_ASSISTANT_MODEL =
  normalizeModelName(process.env.GEMINI_ASSISTANT_MODEL ?? "") ||
  "gemini-3-pro-preview";

const GEMINI_IMAGE_MODEL =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL ?? "") ||
  "gemini-2.5-flash-image-preview";

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
    throw new HttpError(502, `Failed to fetch image: ${res.status}`);
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

export const generateImage = async (params: { prompt: string }) => {
  const ai = getGeminiClient();

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: params.prompt,
      config: {
        responseModalities: ["IMAGE"],
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model: GEMINI_IMAGE_MODEL,
      operation: "generateImage",
    });
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
      config: {
        responseModalities: ["IMAGE"],
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model: GEMINI_IMAGE_MODEL,
      operation: "removeBackground",
    });
  }

  const image = extractInlineImage(response);
  if (!image) {
    throw new HttpError(502, "No image generated");
  }

  return { imageUrl: toDataUrl(image.mimeType, image.data), provider: "gemini" as const };
};

export const getAssistantModel = () => GEMINI_ASSISTANT_MODEL;
