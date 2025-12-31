import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getBearerToken, getOrCreateUserFromPrivyToken } from "@/server/auth";
 
const f = createUploadthing();
 
export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const token = getBearerToken(req.headers.get("authorization") ?? undefined);
      if (!token) {
        throw new UploadThingError("Unauthorized");
      }

      const authUser = await getOrCreateUserFromPrivyToken(token);
      return { userId: authUser.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl ?? file.url };
    }),
  avatarUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const token = getBearerToken(req.headers.get("authorization") ?? undefined);
      if (!token) {
        throw new UploadThingError("Unauthorized");
      }

      const authUser = await getOrCreateUserFromPrivyToken(token);
      return { userId: authUser.id };
    })
    .onUploadComplete(async ({ file }) => {
      const url = file.ufsUrl ?? file.url;
      return { url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
