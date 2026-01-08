import { GoogleGenAI } from "@google/genai";

import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";
import { pickGeminiAspectRatio, type CanvasSize } from "@/server/gemini-image-config";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

export type AiProvider = "gemini";
export type NanoBananaProfile = "nano-banana" | "nano-banana-pro";

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
      const noImageError = new HttpError(502, "No image generated");
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

  throw new HttpError(502, "No image generated");
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
      const noImageError = new HttpError(502, "No image generated");
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

  throw new HttpError(502, "No image generated");
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
      const noImageError = new HttpError(502, "No image generated");
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

  throw new HttpError(502, "No image generated");
};

const stripCodeFences = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/```(?:html)?\\s*([\\s\\S]*?)\\s*```/i);
  return match ? match[1].trim() : trimmed;
};

export const generateHtml = async (params: { prompt: string }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "AI is currently unavailable.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are an expert front-end engineer and designer.
Return a SINGLE self-contained HTML document (no markdown, no code fences).
Constraints:
- Inline CSS only (no external stylesheets).
- Prefer no external network requests (no external images/fonts/libs).
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
    throw new HttpError(502, "No HTML generated");
  }

  return { html, provider: "gemini" as const };
};

export const getAssistantModel = () => GEMINI_ASSISTANT_MODEL;
