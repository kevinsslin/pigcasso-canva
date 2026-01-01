import { GoogleGenAI } from "@google/genai";

import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";
import { pickGeminiAspectRatio, type CanvasSize } from "@/server/gemini-image-config";
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

export const generateImage = async (params: { prompt: string; canvas?: CanvasSize }) => {
  const ai = getGeminiClient();

  const aspectRatio = pickGeminiAspectRatio(params.canvas);

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
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
        model: GEMINI_IMAGE_MODEL,
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
      const noImageError = new HttpError(502, "No image generated");
      if (attempt < maxAttempts) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw noImageError;
    }

    return { imageUrl: toDataUrl(image.mimeType, image.data), provider: "gemini" as const };
  }

  throw new HttpError(502, "No image generated");
};

export const removeBackground = async (params: { image: string }) => {
  const ai = getGeminiClient();

  const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
      const normalized = normalizeGeminiError(error, {
        model: GEMINI_IMAGE_MODEL,
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
      const noImageError = new HttpError(502, "No image generated");
      if (attempt < maxAttempts) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw noImageError;
    }

    return { imageUrl: toDataUrl(image.mimeType, image.data), provider: "gemini" as const };
  }

  throw new HttpError(502, "No image generated");
};

export const getAssistantModel = () => GEMINI_ASSISTANT_MODEL;
