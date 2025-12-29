export type ApiError = Error & {
  status?: number;
  body?: unknown;
};

export const createApiError = (params: {
  message: string;
  status?: number;
  body?: unknown;
}): ApiError => {
  const error = new Error(params.message) as ApiError;
  if (typeof params.status === "number") {
    error.status = params.status;
  }
  if (params.body !== undefined) {
    error.body = params.body;
  }
  return error;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

export const extractBodyErrorMessage = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return null;
  }
  const message = (body as Record<string, unknown>).error;
  return typeof message === "string" ? message : null;
};

