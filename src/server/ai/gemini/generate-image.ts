import type { CanvasSize } from "@/server/gemini-image-config";
import { pickGeminiAspectRatio } from "@/server/gemini-image-config";
import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

import { getGeminiClient } from "./client";
import { parseDataUrl, toDataUrl } from "./data-url";
import { fetchUrlAsBase64 } from "./fetch-base64";
import { extractInlineImage } from "./inline-image";
import { pickGeminiImageModel } from "./models";
import { getRetryDelayMs, isRetryableImageError, sleep } from "./retry";
import type { NanoBananaProfile } from "./types";

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

