import { GoogleGenAI } from "@google/genai";

import { HttpError } from "@/server/http-error";

let cachedGeminiClient: GoogleGenAI | null = null;

export const normalizeModelName = (model: string) => model.trim();

export const getGeminiClient = () => {
  if (cachedGeminiClient) {
    return cachedGeminiClient;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new HttpError(501, "AI is currently unavailable.", { expose: true });
  }

  cachedGeminiClient = new GoogleGenAI({ apiKey });
  return cachedGeminiClient;
};

