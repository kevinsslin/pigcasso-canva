import { HttpError, getErrorStatus } from "@/server/http-error";

const extractMessage = (error: unknown) => {
  if (!error) return null;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return null;
};

const shorten = (value: string, max = 160) => {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
};

export const normalizeGeminiError = (
  error: unknown,
  context?: { model?: string; operation?: string },
) => {
  const status = getErrorStatus(error);
  const rawMessage = extractMessage(error);
  const suffix = [
    context?.operation ? `op=${context.operation}` : null,
    context?.model ? `model=${context.model}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  if (status === 429) {
    return new HttpError(
      429,
      `Gemini API quota exceeded (429). Please check your plan/billing and rate limits in Google AI Studio.${suffix ? ` (${suffix})` : ""}`,
    );
  }

  if (status === 401 || status === 403) {
    return new HttpError(
      401,
      `Gemini API rejected the request (${status}). Please verify your API key and billing.${suffix ? ` (${suffix})` : ""}`,
    );
  }

  if (status === 404) {
    return new HttpError(
      502,
      `Gemini model not found (404). Please update your Gemini model configuration.${suffix ? ` (${suffix})` : ""}`,
    );
  }

  const message = rawMessage ? shorten(rawMessage) : "Gemini request failed.";
  return new HttpError(status ?? 502, suffix ? `${message} (${suffix})` : message);
};
