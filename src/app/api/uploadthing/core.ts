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
      return { url: file.url };
    }),
  avatarUploader: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const token = getBearerToken(req.headers.get("authorization") ?? undefined);
      if (!token) {
        throw new UploadThingError("Unauthorized");
      }

      const authUser = await getOrCreateUserFromPrivyToken(token);
      return { userId: authUser.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db
        .update(users)
        .set({ image: file.url, updatedAt: new Date() })
        .where(eq(users.id, metadata.userId));

      return { url: file.url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
