import { createRouteHandler } from "uploadthing/next";
 
import { ourFileRouter } from "./core";
 
const callbackUrl = (() => {
  const explicit = process.env.UPLOADTHING_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
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
