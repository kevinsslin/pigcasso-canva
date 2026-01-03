import type { ContentfulStatusCode } from "hono/utils/http-status";

export const toContentfulStatus = (status: number): ContentfulStatusCode => {
  const inRange = status >= 200 && status <= 599;
  const isContentless = status === 204 || status === 205 || status === 304;

  if (!inRange || isContentless) {
    return 500;
  }

  return status as ContentfulStatusCode;
};

