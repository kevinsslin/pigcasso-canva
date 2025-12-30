import { GoogleGenAI } from "@google/genai";

import { getReplicateClient } from "@/lib/replicate";
import { HttpError } from "@/server/http-error";

export type AiProvider = "replicate" | "gemini";

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);
const hasReplicate = () => Boolean(process.env.REPLICATE_API_TOKEN);

const resolveDefaultProvider = (): AiProvider => {
  const preferred = process.env.AI_PROVIDER_DEFAULT;

  if (preferred === "gemini" && hasGemini()) {
    return "gemini";
  }

  if (preferred === "replicate" && hasReplicate()) {
    return "replicate";
  }

  if (hasReplicate()) {
    return "replicate";
  }

  if (hasGemini()) {
    return "gemini";
  }

  return "replicate";
};

const DEFAULT_PROVIDER: AiProvider = resolveDefaultProvider();

const getProvider = (provider: AiProvider | undefined): AiProvider =>
  provider ?? DEFAULT_PROVIDER;

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
};

const ensureProviderConfigured = (provider: AiProvider) => {
  if (provider === "gemini" && !hasGemini()) {
    throw new HttpError(501, "GEMINI_API_KEY is not configured");
  }

  if (provider === "replicate" && !hasReplicate()) {
    throw new HttpError(501, "REPLICATE_API_TOKEN is not configured");
  }
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return status;
  }

  const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
  if (typeof responseStatus === "number") {
    return responseStatus;
  }

  return undefined;
};

const normalizeReplicateError = (error: unknown) => {
  const status = getErrorStatus(error);

  if (status === 402) {
    return new HttpError(
      402,
      "Replicate has insufficient credit (402). Add billing at https://replicate.com/account/billing#billing",
    );
  }

  if (status === 401 || status === 403) {
    return new HttpError(
      401,
      "Replicate rejected the request. Check `REPLICATE_API_TOKEN` and account access.",
    );
  }

  if (status === 429) {
    return new HttpError(429, "Replicate rate limit exceeded. Please try again later.");
  }

  return new HttpError(status ?? 502, "Replicate request failed.");
};

const normalizeGeminiError = (error: unknown) => {
  const status = getErrorStatus(error);

  if (status === 429) {
    return new HttpError(
      429,
      "Gemini API quota exceeded (429). Check your plan/billing and rate limits in Google AI Studio.",
    );
  }

  if (status === 401 || status === 403) {
    return new HttpError(
      401,
      "Gemini rejected the request. Check `GEMINI_API_KEY` and that the model is enabled for your project.",
    );
  }

  return new HttpError(status ?? 502, "Gemini request failed.");
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
        mimeType: typeof inlineData.mimeType === "string" ? inlineData.mimeType : "image/png",
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

export const generateImage = async (params: {
  prompt: string;
  provider?: AiProvider;
}) => {
  const provider = getProvider(params.provider);
  ensureProviderConfigured(provider);

  if (provider === "gemini") {
    const ai = getGeminiClient();
    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: params.prompt,
      });
    } catch (error) {
      throw normalizeGeminiError(error);
    }

    const image = extractInlineImage(response);
    if (!image) {
      throw new Error("No image generated");
    }

    return { imageUrl: toDataUrl(image.mimeType, image.data) };
  }

  const input = {
    cfg: 3.5,
    steps: 28,
    prompt: params.prompt,
    aspect_ratio: "3:2",
    output_format: "webp",
    output_quality: 90,
    negative_prompt: "",
    prompt_strength: 0.85,
  };

  const replicate = getReplicateClient();
  let output: unknown;
  try {
    output = await replicate.run("stability-ai/stable-diffusion-3", { input });
  } catch (error) {
    throw normalizeReplicateError(error);
  }
  if (!Array.isArray(output) || typeof output[0] !== "string") {
    throw new Error("Unexpected output from Replicate");
  }

  return { imageUrl: output[0] };
};

export const removeBackground = async (params: {
  image: string;
  provider?: AiProvider;
}) => {
  const provider = getProvider(params.provider);
  ensureProviderConfigured(provider);

  if (provider === "gemini") {
    const ai = getGeminiClient();

    const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

    let response: unknown;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
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
      throw new Error("No image generated");
    }

    return { imageUrl: toDataUrl(image.mimeType, image.data) };
  }

  const input = {
    image: params.image,
  };

  const replicate = getReplicateClient();
  let output: unknown;
  try {
    output = await replicate.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      { input },
    );
  } catch (error) {
    throw normalizeReplicateError(error);
  }

  if (typeof output !== "string") {
    throw new Error("Unexpected output from Replicate");
  }

  return { imageUrl: output };
};
