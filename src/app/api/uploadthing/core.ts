import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { eq } from "drizzle-orm";

import { getBearerToken, getOrCreateUserFromPrivyToken } from "@/server/auth";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
 
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
    .onUploadComplete(async ({ metadata, file }) => {
      const url = file.ufsUrl ?? file.url;
      await db
        .update(users)
        .set({ image: url, updatedAt: new Date() })
        .where(eq(users.id, metadata.userId));

      return { url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
