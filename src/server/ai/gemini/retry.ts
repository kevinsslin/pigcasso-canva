import { HttpError } from "@/server/http-error";

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const isRetryableImageError = (error: HttpError) => {
  return (
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504
  );
};

export const getRetryDelayMs = (attemptIndex: number) => {
  const base = 400;
  return base * attemptIndex;
};

