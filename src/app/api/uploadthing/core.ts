import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getBearerToken, getOrCreateUserFromPrivyToken } from "@/server/auth";
 
const f = createUploadthing();
 
export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      const token = getBearerToken(req.headers.get("authorization") ?? undefined);
      if (!token) {
        throw new UploadThingError("Unauthorized");
      }

      const authUser = await getOrCreateUserFromPrivyToken(token);
      return { userId: authUser.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
