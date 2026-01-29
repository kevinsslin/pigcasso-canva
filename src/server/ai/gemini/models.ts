import { normalizeModelName } from "./client";
import type { NanoBananaProfile } from "./types";

export const GEMINI_ASSISTANT_MODEL =
  normalizeModelName(process.env.GEMINI_ASSISTANT_MODEL ?? "") ||
  "gemini-3-pro-preview";

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_IMAGEN_MODEL = "imagen-4.0-generate-001";
const DEPRECATED_IMAGE_MODELS = new Map<string, string>([
  ["gemini-2.5-flash-image-preview", DEFAULT_GEMINI_IMAGE_MODEL],
  ["imagen-3.0-generate-002", DEFAULT_IMAGEN_MODEL],
]);

const normalizeImageModelName = (model: string) => {
  const normalized = normalizeModelName(model);
  if (!normalized) return "";
  const stripped = normalized.replace(/^models\//, "");
  const replacement = DEPRECATED_IMAGE_MODELS.get(stripped);
  if (replacement) {
    return replacement;
  }
  return normalized;
};

export const GEMINI_IMAGE_MODEL =
  normalizeImageModelName(process.env.GEMINI_IMAGE_MODEL ?? "") ||
  DEFAULT_GEMINI_IMAGE_MODEL;

export const DEFAULT_GEMINI_OCR_MODEL = "gemini-2.0-flash";

export const GEMINI_OCR_MODEL =
  normalizeModelName(process.env.GEMINI_OCR_MODEL ?? "") ||
  DEFAULT_GEMINI_OCR_MODEL;

const GEMINI_IMAGE_MODEL_NANO_BANANA =
  normalizeImageModelName(process.env.GEMINI_IMAGE_MODEL_NANO_BANANA ?? "") || "";

const GEMINI_IMAGE_MODEL_NANO_BANANA_PRO =
  normalizeImageModelName(process.env.GEMINI_IMAGE_MODEL_NANO_BANANA_PRO ?? "") || "";

export const pickGeminiImageModel = (profile?: NanoBananaProfile) => {
  if (profile === "nano-banana-pro") {
    return GEMINI_IMAGE_MODEL_NANO_BANANA_PRO || GEMINI_IMAGE_MODEL_NANO_BANANA || GEMINI_IMAGE_MODEL;
  }
  if (profile === "nano-banana") {
    return GEMINI_IMAGE_MODEL_NANO_BANANA || GEMINI_IMAGE_MODEL;
  }
  return GEMINI_IMAGE_MODEL;
};

export const getAssistantModel = () => GEMINI_ASSISTANT_MODEL;
