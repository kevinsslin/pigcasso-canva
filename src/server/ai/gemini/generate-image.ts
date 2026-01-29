import { RawReferenceImage } from "@google/genai";

import type { CanvasSize } from "@/server/gemini-image-config";
import { pickGeminiAspectRatio } from "@/server/gemini-image-config";
import { HttpError, getErrorStatus } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

import { getGeminiClient } from "./client";
import { parseDataUrl, toDataUrl } from "./data-url";
import { fetchUrlAsBase64 } from "./fetch-base64";
import { extractInlineImage } from "./inline-image";
import { pickGeminiImageModel } from "./models";
import { getRetryDelayMs, isRetryableImageError, sleep } from "./retry";
import type { NanoBananaProfile } from "./types";

type ImagenResponse = {
  generatedImages?: Array<{ image?: { imageBytes?: string; mimeType?: string } }>;
};

const IMAGEN_GENERATE_MODEL = "imagen-4.0-generate-001";
const IMAGEN_EDIT_MODEL = "imagen-3.0-capability-001";

const IMAGEN_ASPECT_RATIOS = [
  { value: "1:1", ratio: 1 },
  { value: "3:4", ratio: 3 / 4 },
  { value: "4:3", ratio: 4 / 3 },
  { value: "9:16", ratio: 9 / 16 },
  { value: "16:9", ratio: 16 / 9 },
] as const;

const stripModelPrefix = (model: string) => model.replace(/^models\//, "");

const isImagenModel = (model: string) => stripModelPrefix(model).startsWith("imagen-");

const pickImagenAspectRatio = (aspectRatio?: string) => {
  if (!aspectRatio) {
    return undefined;
  }

  const [width, height] = aspectRatio.split(":").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) {
    return undefined;
  }

  const ratio = width / height;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return undefined;
  }

  type ImagenAspectRatio = (typeof IMAGEN_ASPECT_RATIOS)[number];
  let best: ImagenAspectRatio = IMAGEN_ASPECT_RATIOS[0];
  let bestDistance = Math.abs(ratio - best.ratio);

  for (const candidate of IMAGEN_ASPECT_RATIOS.slice(1)) {
    const distance = Math.abs(ratio - candidate.ratio);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best.value;
};

const buildImagenReferences = (
  base: { mimeType: string; base64: string },
  references: Array<{ mimeType: string; base64: string }>,
) => {
  return [base, ...references].map((image) => {
    const ref = new RawReferenceImage();
    ref.referenceImage = {
      mimeType: image.mimeType,
      imageBytes: image.base64,
    };
    return ref;
  });
};

const extractImagenImage = (response: ImagenResponse) => {
  const image = response.generatedImages?.[0]?.image;
  if (!image?.imageBytes) {
    return null;
  }
  return {
    mimeType: image.mimeType ?? "image/png",
    data: image.imageBytes,
  };
};

const getImagenGenerateModel = (model: string) =>
  isImagenModel(model) ? stripModelPrefix(model) : IMAGEN_GENERATE_MODEL;

const getImagenEditModel = (model: string) => {
  if (!isImagenModel(model)) {
    return IMAGEN_EDIT_MODEL;
  }
  const normalized = stripModelPrefix(model);
  if (normalized.includes("generate")) {
    return IMAGEN_EDIT_MODEL;
  }
  return normalized;
};

const runGeminiImageOperation = async (params: {
  model: string;
  operation: "generateImage" | "removeBackground" | "editImage";
  request: () => Promise<unknown>;
  onModelNotFound?: () => Promise<{ imageUrl: string; provider: "gemini" }>;
}) => {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    try {
      response = await params.request();
    } catch (error) {
      if (getErrorStatus(error) === 404 && params.onModelNotFound) {
        return params.onModelNotFound();
      }
      const normalized = normalizeGeminiError(error, {
        model: params.model,
        operation: params.operation,
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

const runImagenGenerate = async (params: {
  ai: ReturnType<typeof getGeminiClient>;
  model: string;
  prompt: string;
  aspectRatio?: string;
}) => {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    try {
      response = await params.ai.models.generateImages({
        model: params.model,
        prompt: params.prompt,
        config: params.aspectRatio ? { aspectRatio: params.aspectRatio } : undefined,
      });
    } catch (error) {
      const normalized = normalizeGeminiError(error, {
        model: params.model,
        operation: "generateImage",
      });
      if (attempt < maxAttempts && isRetryableImageError(normalized)) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw normalized;
    }

    const image = extractImagenImage(response as ImagenResponse);
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

const runImagenEdit = async (params: {
  ai: ReturnType<typeof getGeminiClient>;
  model: string;
  prompt: string;
  referenceImages: RawReferenceImage[];
  aspectRatio?: string;
  outputMimeType?: string;
  operation: "removeBackground" | "editImage";
}) => {
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: unknown;
    const config =
      params.aspectRatio || params.outputMimeType
        ? {
            ...(params.aspectRatio ? { aspectRatio: params.aspectRatio } : {}),
            ...(params.outputMimeType ? { outputMimeType: params.outputMimeType } : {}),
          }
        : undefined;

    try {
      response = await params.ai.models.editImage({
        model: params.model,
        prompt: params.prompt,
        referenceImages: params.referenceImages,
        config,
      });
    } catch (error) {
      const normalized = normalizeGeminiError(error, {
        model: params.model,
        operation: params.operation,
      });
      if (attempt < maxAttempts && isRetryableImageError(normalized)) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw normalized;
    }

    const image = extractImagenImage(response as ImagenResponse);
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

export const generateImage = async (params: {
  prompt: string;
  canvas?: CanvasSize;
  profile?: NanoBananaProfile;
}) => {
  const ai = getGeminiClient();
  const model = pickGeminiImageModel(params.profile);

  const aspectRatio = pickGeminiAspectRatio(params.canvas);
  const imagenAspectRatio = pickImagenAspectRatio(aspectRatio);

  if (isImagenModel(model)) {
    return runImagenGenerate({
      ai,
      model: getImagenGenerateModel(model),
      prompt: params.prompt,
      aspectRatio: imagenAspectRatio,
    });
  }

  return runGeminiImageOperation({
    model,
    operation: "generateImage",
    request: () =>
      ai.models.generateContent({
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
      }),
    onModelNotFound: () =>
      runImagenGenerate({
        ai,
        model: IMAGEN_GENERATE_MODEL,
        prompt: params.prompt,
        aspectRatio: imagenAspectRatio,
      }),
  });
};

export const removeBackground = async (params: { image: string }) => {
  const ai = getGeminiClient();
  const model = pickGeminiImageModel("nano-banana");

  const inline = parseDataUrl(params.image) ?? (await fetchUrlAsBase64(params.image));
  const prompt = "Remove the background and return a transparent PNG.";
  const referenceImages = buildImagenReferences(inline, []);

  if (isImagenModel(model)) {
    return runImagenEdit({
      ai,
      model: getImagenEditModel(model),
      prompt,
      referenceImages,
      outputMimeType: "image/png",
      operation: "removeBackground",
    });
  }

  return runGeminiImageOperation({
    model,
    operation: "removeBackground",
    request: () =>
      ai.models.generateContent({
        model,
        contents: [
          { text: prompt },
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
      }),
    onModelNotFound: () =>
      runImagenEdit({
        ai,
        model: IMAGEN_EDIT_MODEL,
        prompt,
        referenceImages,
        outputMimeType: "image/png",
        operation: "removeBackground",
      }),
  });
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
  const imagenAspectRatio = pickImagenAspectRatio(aspectRatio);
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
  const referenceImages = buildImagenReferences(base, references);

  if (isImagenModel(model)) {
    return runImagenEdit({
      ai,
      model: getImagenEditModel(model),
      prompt,
      referenceImages,
      aspectRatio: imagenAspectRatio,
      operation: "editImage",
    });
  }

  return runGeminiImageOperation({
    model,
    operation: "editImage",
    request: () =>
      ai.models.generateContent({
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
      }),
    onModelNotFound: () =>
      runImagenEdit({
        ai,
        model: IMAGEN_EDIT_MODEL,
        prompt,
        referenceImages,
        aspectRatio: imagenAspectRatio,
        operation: "editImage",
      }),
  });
};
