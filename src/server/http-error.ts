import { HTTPException } from "hono/http-exception";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
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

