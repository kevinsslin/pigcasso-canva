import { createRouteHandler } from "uploadthing/next";
 
import { ourFileRouter } from "./core";
 
const resolveAppUrl = () => {
  const explicit =
    process.env.UPLOADTHING_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();

  if (!vercel) {
    return undefined;
  }

  const normalized = vercel.replace(/^https?:\/\//, "");
  return `https://${normalized}`;
};

const callbackUrl = (() => {
  const appUrl = resolveAppUrl();
  if (!appUrl) {
    return undefined;
  }

  try {
    return new URL("/api/uploadthing", appUrl).toString();
  } catch {
    return undefined;
  }
})();

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    callbackUrl,
    token: process.env.UPLOADTHING_TOKEN?.trim(),
    logLevel: process.env.NODE_ENV === "development" ? "Debug" : "Error",
  },
});
