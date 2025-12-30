import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

export type ApiFallbackMessage =
  | string
  | ((params: { status: number; body: unknown }) => string);

export const readResponseBody = async (response: Response): Promise<unknown> => {
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
};

export const readApiResponse = async <T>(
  response: Response,
  fallbackMessage: ApiFallbackMessage,
): Promise<T> => {
  const body = await readResponseBody(response);

  if (!response.ok) {
    const fallback =
      typeof fallbackMessage === "function"
        ? fallbackMessage({ status: response.status, body })
        : fallbackMessage;
    const message = extractBodyErrorMessage(body) ?? fallback;
    throw createApiError({ message, status: response.status, body });
  }

  return body as T;
};

