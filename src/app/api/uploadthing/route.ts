import { createRouteHandler } from "uploadthing/next";
 
import { ourFileRouter } from "./core";
 
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    callbackUrl: process.env.UPLOADTHING_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    uploadthingId: process.env.UPLOADTHING_APP_ID?.trim(),
    uploadthingSecret: process.env.UPLOADTHING_SECRET?.trim(),
    logLevel: process.env.NODE_ENV === "development" ? "debug" : "error",
  },
});
