import { HTTPException } from "hono/http-exception";

export type HttpErrorOptions = {
  code?: string;
  expose?: boolean;
  cause?: unknown;
};

export class HttpError extends Error {
  status: number;
  code?: string;
  expose: boolean;

  constructor(status: number, message: string, options?: HttpErrorOptions) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = options?.code;
    this.expose = options?.expose ?? status < 500;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export const getErrorStatus = (error: unknown): number | undefined => {
  if (error instanceof HttpError) {
    return error.status;
  }

  if (error instanceof HTTPException) {
    return error.status;
  }

  if (!error || typeof error !== "object") {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return status;
  }

  const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
  if (typeof responseStatus === "number") {
    return responseStatus;
  }

  return undefined;
};
