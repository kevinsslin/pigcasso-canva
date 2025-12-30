import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { nftAssets, projects } from "@/db/schema";
import { MANTLE_CHAIN_ID } from "@/lib/web3-constants";
import { requireAuth } from "@/server/hono-auth";

const app = new Hono()
  .get(
    "/",
    requireAuth,
    zValidator(
      "query",
      z.object({
        page: z.coerce.number().min(1).optional().default(1),
        limit: z.coerce.number().min(1).max(50).optional().default(20),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { page, limit } = c.req.valid("query");

      const data = await db
        .select({
          id: nftAssets.id,
          projectId: nftAssets.projectId,
          chainId: nftAssets.chainId,
          status: nftAssets.status,
          collectionAddress: nftAssets.collectionAddress,
          tokenId: nftAssets.tokenId,
          txHash: nftAssets.txHash,
          metadataUri: nftAssets.metadataUri,
          imageUri: nftAssets.imageUri,
          name: nftAssets.name,
          description: nftAssets.description,
          createdAt: nftAssets.createdAt,
          updatedAt: nftAssets.updatedAt,
          projectName: projects.name,
          projectThumbnailUrl: projects.thumbnailUrl,
        })
        .from(nftAssets)
        .innerJoin(projects, eq(projects.id, nftAssets.projectId))
        .where(and(eq(nftAssets.userId, auth.id), eq(projects.userId, auth.id)))
        .orderBy(desc(nftAssets.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return c.json({
        data,
        nextPage: data.length === limit ? page + 1 : null,
      });
    },
  )
  .post(
    "/",
    requireAuth,
    zValidator(
      "json",
      z.object({
        projectId: z.string().min(1),
        name: z.string().trim().max(120).optional(),
        description: z.string().trim().max(500).optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { projectId, name, description } = c.req.valid("json");

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const [created] = await db
        .insert(nftAssets)
        .values({
          userId: auth.id,
          projectId,
          chainId: MANTLE_CHAIN_ID,
          status: "draft",
          name: name?.trim() || null,
          description: description?.trim() || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to create asset" }, 400);
      }

      return c.json({ data: created });
    },
  );

export default app;
