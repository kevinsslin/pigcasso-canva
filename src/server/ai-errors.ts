import { HttpError, getErrorStatus } from "@/server/http-error";

export const normalizeGeminiError = (error: unknown) => {
  const status = getErrorStatus(error);

  if (status === 429) {
    return new HttpError(
      429,
      "AI is busy right now. Please try again later.",
    );
  }

  if (status === 401 || status === 403) {
    return new HttpError(
      401,
      "AI provider rejected the request. Please try again later.",
    );
  }

  return new HttpError(status ?? 502, "Gemini request failed.");
};
