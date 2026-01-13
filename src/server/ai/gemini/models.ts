import { normalizeModelName } from "./client";
import type { NanoBananaProfile } from "./types";

export const GEMINI_ASSISTANT_MODEL =
  normalizeModelName(process.env.GEMINI_ASSISTANT_MODEL ?? "") ||
  "gemini-3-pro-preview";

export const GEMINI_IMAGE_MODEL =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL ?? "") ||
  "gemini-2.5-flash-image-preview";

export const DEFAULT_GEMINI_OCR_MODEL = "gemini-2.0-flash";

export const GEMINI_OCR_MODEL =
  normalizeModelName(process.env.GEMINI_OCR_MODEL ?? "") ||
  DEFAULT_GEMINI_OCR_MODEL;

const GEMINI_IMAGE_MODEL_NANO_BANANA =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL_NANO_BANANA ?? "") || "";

const GEMINI_IMAGE_MODEL_NANO_BANANA_PRO =
  normalizeModelName(process.env.GEMINI_IMAGE_MODEL_NANO_BANANA_PRO ?? "") || "";

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

