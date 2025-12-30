import { GoogleGenAI } from "@google/genai";

import { getReplicateClient } from "@/lib/replicate";
import { HttpError, getErrorStatus } from "@/server/http-error";
import { normalizeGeminiError, normalizeReplicateError } from "@/server/ai-errors";

export type AiProvider = "replicate" | "gemini";
export type AiProviderPreference = AiProvider | "auto";

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

  if (hasGemini()) {
    return "gemini";
  }

  if (hasReplicate()) {
    return "replicate";
  }

  return "replicate";
};

const DEFAULT_PROVIDER: AiProvider = resolveDefaultProvider();

const getOtherProvider = (provider: AiProvider): AiProvider =>
  provider === "replicate" ? "gemini" : "replicate";

const getProviderOrder = (
  preference: AiProviderPreference | undefined,
): AiProvider[] => {
  if (preference && preference !== "auto") {
    return [preference];
  }

  const primary = DEFAULT_PROVIDER;
  const secondary = getOtherProvider(primary);

  const order: AiProvider[] = [];
  if (primary === "replicate" ? hasReplicate() : hasGemini()) {
    order.push(primary);
  }
  if (secondary === "replicate" ? hasReplicate() : hasGemini()) {
    order.push(secondary);
  }

  return order;
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
};

const GEMINI_ASSISTANT_MODEL =
  process.env.GEMINI_ASSISTANT_MODEL?.trim() || "gemini-2.5-pro";

const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image-preview";

const ensureProviderConfigured = (provider: AiProvider) => {
  if (provider === "gemini" && !hasGemini()) {
    throw new HttpError(501, "GEMINI_API_KEY is not configured");
  }

  if (provider === "replicate" && !hasReplicate()) {
    throw new HttpError(501, "REPLICATE_API_TOKEN is not configured");
  }
};

const isProviderUnavailable = (error: unknown) => {
  const status =
    error instanceof HttpError ? error.status : getErrorStatus(error);

  if (typeof status !== "number") {
    return false;
  }

  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 429 ||
    status >= 500
  );
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
  provider?: AiProviderPreference;
}) => {
  const providerOrder = getProviderOrder(params.provider);
  if (providerOrder.length === 0) {
    throw new HttpError(
      501,
      "No AI provider is configured. Set `REPLICATE_API_TOKEN` and/or `GEMINI_API_KEY`.",
    );
  }

  let lastError: unknown = null;

  for (const provider of providerOrder) {
    try {
      ensureProviderConfigured(provider);

      if (provider === "gemini") {
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
          throw new Error("No image generated");
        }

        return { imageUrl: toDataUrl(image.mimeType, image.data), provider };
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

      return { imageUrl: output[0], provider };
    } catch (error) {
      lastError = error;

      if (params.provider && params.provider !== "auto") {
        throw error;
      }

      if (!isProviderUnavailable(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new HttpError(502, "AI request failed.");
};

export const removeBackground = async (params: {
  image: string;
  provider?: AiProviderPreference;
}) => {
  const providerOrder = getProviderOrder(params.provider);
  if (providerOrder.length === 0) {
    throw new HttpError(
      501,
      "No AI provider is configured. Set `REPLICATE_API_TOKEN` and/or `GEMINI_API_KEY`.",
    );
  }

  let lastError: unknown = null;

  for (const provider of providerOrder) {
    try {
      ensureProviderConfigured(provider);

      if (provider === "gemini") {
        const ai = getGeminiClient();

        const inline =
          parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

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
          throw new Error("No image generated");
        }

        return { imageUrl: toDataUrl(image.mimeType, image.data), provider };
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

      return { imageUrl: output, provider };
    } catch (error) {
      lastError = error;

      if (params.provider && params.provider !== "auto") {
        throw error;
      }

      if (!isProviderUnavailable(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new HttpError(502, "AI request failed.");
};
