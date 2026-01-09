import { HttpError } from "@/server/http-error";

type DbErrorLike = {
  code?: unknown;
  message?: unknown;
};

const getDbErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as DbErrorLike).code;
  return typeof code === "string" ? code : null;
};

const getDbErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const message = (error as DbErrorLike).message;
    if (typeof message === "string") return message;
  }
  return "";
};

export const normalizeDbError = (
  error: unknown,
  params: {
    uniqueViolationMessage?: string;
    fallbackMessage: string;
  },
): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  const code = getDbErrorCode(error);
  const message = getDbErrorMessage(error);

  if (code === "23505") {
    return new HttpError(409, params.uniqueViolationMessage ?? params.fallbackMessage);
  }

  if (code === "23503") {
    return new HttpError(400, params.fallbackMessage);
  }

  if (code === "42P01" || code === "42703") {
    return new HttpError(500, "Database schema is out of date. Please run migrations.", {
      code: "DB_SCHEMA_OUT_OF_DATE",
      expose: true,
    });
  }

  if (/column .* does not exist/i.test(message) || /relation .* does not exist/i.test(message)) {
    return new HttpError(500, "Database schema is out of date. Please run migrations.", {
      code: "DB_SCHEMA_OUT_OF_DATE",
      expose: true,
    });
  }

  return new HttpError(500, params.fallbackMessage);
};
