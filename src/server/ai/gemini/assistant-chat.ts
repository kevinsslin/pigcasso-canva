import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

import { getGeminiClient } from "./client";
import { GEMINI_ASSISTANT_MODEL } from "./models";

export const chatAssistant = async (params: { prompt: string }) => {
  const ai = getGeminiClient();
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are Pigcasso, an AI design partner.
Respond with plain text (no markdown, no code fences).
Be concise by default; ask clarifying questions when needed.
`.trim();

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model,
      contents: params.prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: 1200,
        temperature: 0.7,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model,
      operation: "chatAssistant",
    });
  }

  const text =
    typeof (response as { text?: unknown })?.text === "string"
      ? ((response as { text?: string }).text ?? "").trim()
      : "";

  if (!text) {
    throw new HttpError(502, "No response generated", { expose: true });
  }

  return { text, provider: "gemini" as const };
};

