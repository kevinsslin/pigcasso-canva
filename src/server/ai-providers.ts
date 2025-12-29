import { GoogleGenAI } from "@google/genai";

import { replicate } from "@/lib/replicate";

export type AiProvider = "replicate" | "gemini";

const DEFAULT_PROVIDER: AiProvider =
  process.env.AI_PROVIDER_DEFAULT === "gemini" ? "gemini" : "replicate";

const getProvider = (provider: AiProvider | undefined): AiProvider =>
  provider ?? DEFAULT_PROVIDER;

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
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

  if (provider === "gemini") {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: params.prompt,
    });

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

  const output = await replicate.run("stability-ai/stable-diffusion-3", { input });
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

  if (provider === "gemini") {
    const ai = getGeminiClient();

    const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));

    const response = await ai.models.generateContent({
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

    const image = extractInlineImage(response);
    if (!image) {
      throw new Error("No image generated");
    }

    return { imageUrl: toDataUrl(image.mimeType, image.data) };
  }

  const input = {
    image: params.image,
  };

  const output: unknown = await replicate.run(
    "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
    { input },
  );

  if (typeof output !== "string") {
    throw new Error("Unexpected output from Replicate");
  }

  return { imageUrl: output };
};
