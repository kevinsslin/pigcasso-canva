import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

import { getGeminiClient } from "./client";
import { GEMINI_ASSISTANT_MODEL } from "./models";
import { stripCodeFences } from "./text";

export const generateHtml = async (params: { prompt: string }) => {
  const ai = getGeminiClient();
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are an expert front-end engineer and designer.
Return a SINGLE self-contained HTML document (no markdown, no code fences).
Constraints:
- Must start with <!doctype html> and include <html>, <head>, and <body>.
- Inline CSS only (no external stylesheets).
- NO external network requests: no <script src>, no <link rel="stylesheet" href>, no external images, no external fonts, no CDNs.
- Use system fonts only.
- Use a LIGHT background (prefer #F3F4F5 or white) and high-contrast text (prefer #111827).
- Avoid dark/black full-screen backgrounds unless explicitly requested.
- Avoid effects that commonly break HTML-to-image previews: avoid backdrop-filter, avoid huge filter blur, avoid mix-blend-mode, avoid heavy SVG filters.
- Ensure the layout is immediately visible (no blank screens; no relying on external JS).
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
    throw new HttpError(502, "No HTML generated", { expose: true });
  }

  return { html, provider: "gemini" as const };
};
