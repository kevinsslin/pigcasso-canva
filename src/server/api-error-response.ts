import type { StatusCode } from "hono/utils/http-status";

import { toContentfulStatus } from "@/server/contentful-status";
import { HttpError, getErrorStatus } from "@/server/http-error";

export type PublicApiErrorBody = {
  error: string;
  code?: string;
};

const extractMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === "string") {
    const trimmed = error.message.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const shorten = (value: string, max = 220) => {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
};

export const toPublicApiError = (error: unknown): { status: StatusCode; body: PublicApiErrorBody } => {
  const status = toContentfulStatus(getErrorStatus(error) ?? 500);
  const isProd = process.env.NODE_ENV === "production";

  const message = extractMessage(error);
  const code = error instanceof HttpError ? error.code : undefined;

  if (status === 401) {
    const body: PublicApiErrorBody = {
      error: isProd ? "Unauthorized" : message ?? "Unauthorized",
      ...(code ? { code } : {}),
    };
    return { status, body };
  }

  if (status >= 500) {
    const expose = !isProd || (error instanceof HttpError && error.expose);
    const body: PublicApiErrorBody = {
      error: expose ? shorten(message ?? "Internal Server Error") : "Internal Server Error",
      ...(code ? { code } : {}),
    };
    return { status, body };
  }

  const body: PublicApiErrorBody = {
    error: shorten(message ?? "Request failed"),
    ...(code ? { code } : {}),
  };

  return { status, body };
};

