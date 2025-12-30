import { HttpError, getErrorStatus } from "@/server/http-error";

export const normalizeReplicateError = (error: unknown) => {
  const status = getErrorStatus(error);

  if (status === 402) {
    return new HttpError(
      402,
      "Replicate has insufficient credit (402). Add billing at https://replicate.com/account/billing#billing",
    );
  }

  if (status === 401 || status === 403) {
    return new HttpError(
      401,
      "Replicate rejected the request. Check `REPLICATE_API_TOKEN` and account access.",
    );
  }

  if (status === 429) {
    return new HttpError(429, "Replicate rate limit exceeded. Please try again later.");
  }

  return new HttpError(status ?? 502, "Replicate request failed.");
};

export const normalizeGeminiError = (error: unknown) => {
  const status = getErrorStatus(error);

  if (status === 429) {
    return new HttpError(
      429,
      "Gemini API quota exceeded (429). Check your plan/billing and rate limits in Google AI Studio.",
    );
  }

  if (status === 401 || status === 403) {
    return new HttpError(
      401,
      "Gemini rejected the request. Check `GEMINI_API_KEY` and that the model is enabled for your project.",
    );
  }

  return new HttpError(status ?? 502, "Gemini request failed.");
};

