import { z } from "zod";

import { HttpError } from "@/server/http-error";
import { normalizeGeminiError } from "@/server/ai-errors";

import { getGeminiClient } from "./client";
import { GEMINI_ASSISTANT_MODEL } from "./models";
import { stripJsonFences } from "./text";
import type { AiProvider } from "./types";

const analyzeCanvasPromptSchema = z.discriminatedUnion("route", [
  z.object({
    route: z.literal("generate_image"),
    prompt: z.string().trim().min(1).max(6000),
  }),
  z.object({
    route: z.literal("generate_html"),
    prompt: z.string().trim().min(1).max(6000),
  }),
  z.object({
    route: z.literal("edit_selected_image"),
    instruction: z.string().trim().min(1).max(2000),
  }),
  z.object({
    route: z.literal("ask_clarify"),
    question: z.string().trim().min(1).max(1200),
  }),
]);

export type AnalyzeCanvasPromptResult = z.infer<typeof analyzeCanvasPromptSchema>;

const parseAnalyzeCanvasPromptResponse = (text: string): AnalyzeCanvasPromptResult => {
  const trimmed = stripJsonFences(text);
  if (!trimmed) {
    throw new HttpError(502, "No analysis generated", { expose: true });
  }

  const candidate = (() => {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }
    return trimmed;
  })();

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new HttpError(502, "AI returned invalid JSON", { expose: true });
  }

  const validated = analyzeCanvasPromptSchema.safeParse(parsed);
  if (!validated.success) {
    throw new HttpError(502, "AI returned an invalid plan", { expose: true });
  }

  return validated.data;
};

const fallbackAnalyzeCanvasPrompt = (params: {
  prompt: string;
  selectionType?: string | null;
  hasContext?: boolean;
}): AnalyzeCanvasPromptResult => {
  const prompt = params.prompt.trim();
  const lowered = prompt.toLowerCase();
  const selectionType = (params.selectionType ?? "").toLowerCase();

  const wantsHtml =
    /\\bhtml\\b/.test(lowered) ||
    lowered.includes("landing page") ||
    lowered.includes("website") ||
    lowered.includes("web page") ||
    lowered.includes("homepage");

  if (wantsHtml) {
    return { route: "generate_html", prompt };
  }

  const hasImageSelected = selectionType === "image";
  const looksLikeEdit =
    hasImageSelected &&
    (/\\bedit\\b/.test(lowered) ||
      lowered.includes("remove background") ||
      lowered.includes("remove bg") ||
      lowered.includes("change text") ||
      lowered.includes("fix text") ||
      lowered.includes("swap") ||
      lowered.includes("replace") ||
      lowered.includes("retouch") ||
      lowered.includes("cleanup") ||
      lowered.includes("color"));

  if (looksLikeEdit) {
    return { route: "edit_selected_image", instruction: prompt };
  }

  const tooVague =
    prompt.length < 18 &&
    !wantsHtml &&
    !hasImageSelected &&
    (lowered.includes("make it") || lowered.includes("improve") || lowered.includes("better"));

  if (tooVague && !params.hasContext) {
    return {
      route: "ask_clarify",
      question: "What should I create? (e.g. image, landing page HTML, or an edit to a selected image)",
    };
  }

  return { route: "generate_image", prompt };
};

export const analyzeCanvasPrompt = async (params: {
  prompt: string;
  context?: string | null;
  selection?: { type: string; label?: string | null } | null;
}): Promise<{ data: AnalyzeCanvasPromptResult; provider: AiProvider }> => {
  const ai = getGeminiClient();
  const model = GEMINI_ASSISTANT_MODEL;

  const system = `
You are Pigcasso's planner/router for an infinite canvas design tool.
Return a SINGLE JSON object (no markdown, no code fences) matching EXACTLY one of these shapes:

1) {"route":"generate_image","prompt":"..."}
2) {"route":"generate_html","prompt":"..."}
3) {"route":"edit_selected_image","instruction":"..."}  (only if the current selection is an image AND the user request is to modify it)
4) {"route":"ask_clarify","question":"..."}  (if the request is ambiguous / missing key details)

Rules:
- Prefer "generate_html" when the user asks for a webpage / landing page / HTML.
- Prefer "edit_selected_image" when an image is selected and the user asks to change that image (remove background, fix text, recolor, etc).
- Otherwise prefer "generate_image".
- Keep prompts concise but specific (style + subject + key constraints).
- For HTML prompts: keep it self-contained (no external assets, no external fonts, no CDNs), and default to a light background (#F3F4F5 or white).
`.trim();

  const inputPayload = {
    prompt: params.prompt.trim(),
    selection: params.selection
      ? { type: params.selection.type, label: params.selection.label ?? null }
      : { type: "none", label: null },
    context: params.context?.trim() ? params.context.trim() : null,
  };

  let response: unknown;
  try {
    response = await ai.models.generateContent({
      model,
      contents: JSON.stringify(inputPayload),
      config: {
        systemInstruction: system,
        maxOutputTokens: 550,
        temperature: 0.2,
      },
    });
  } catch (error) {
    throw normalizeGeminiError(error, {
      model,
      operation: "analyzeCanvasPrompt",
    });
  }

  const text =
    typeof (response as { text?: unknown })?.text === "string"
      ? ((response as { text?: string }).text ?? "").trim()
      : "";

  const data = (() => {
    try {
      return parseAnalyzeCanvasPromptResponse(text);
    } catch {
      return fallbackAnalyzeCanvasPrompt({
        prompt: params.prompt,
        selectionType: params.selection?.type ?? null,
        hasContext: Boolean(params.context?.trim()),
      });
    }
  })();

  return { data, provider: "gemini" as const };
};

