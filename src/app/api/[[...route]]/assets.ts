import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { nftAssets, projectPages, projects } from "@/db/schema";
import { MANTLE_CHAIN_ID } from "@/lib/web3-constants";
import { requireAuth } from "@/server/hono-auth";
import { HttpError } from "@/server/http-error";
import { hasIpfsConfigured, pinFileFromUrlToIpfs, pinJsonToIpfs } from "@/server/ipfs";
import { buildNftAssetMetadata } from "@/server/nft-metadata";

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
          projectPageId: nftAssets.projectPageId,
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
          pageIndex: projectPages.index,
          pageName: projectPages.name,
          pageThumbnailUrl: projectPages.thumbnailUrl,
        })
        .from(nftAssets)
        .innerJoin(projects, eq(projects.id, nftAssets.projectId))
        .leftJoin(projectPages, eq(projectPages.id, nftAssets.projectPageId))
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
        projectPageId: z.string().min(1).optional(),
        name: z.string().trim().max(120).optional(),
        description: z.string().trim().max(500).optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { projectId, projectPageId, name, description } = c.req.valid("json");

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
          projectPageId: projectPageId ?? null,
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
  )
  .post(
    "/export",
    requireAuth,
    zValidator(
      "json",
      z.object({
        projectId: z.string().min(1),
        projectPageId: z.string().min(1),
        imageUrl: z.string().trim().url(),
        sourceJson: z.string().trim().min(1).optional(),
        name: z.string().trim().max(120).optional(),
        description: z.string().trim().max(500).optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { projectId, projectPageId, imageUrl, sourceJson, name, description } =
        c.req.valid("json");

      if (!hasIpfsConfigured()) {
        return c.json({ error: "IPFS pinning is currently unavailable." }, 501);
      }

      const [project] = await db
        .select({
          id: projects.id,
          name: projects.name,
        })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const [page] = await db
        .select({
          id: projectPages.id,
          index: projectPages.index,
          name: projectPages.name,
          json: projectPages.json,
        })
        .from(projectPages)
        .where(and(eq(projectPages.id, projectPageId), eq(projectPages.projectId, projectId)));

      if (!page) {
        return c.json({ error: "Not found" }, 404);
      }

      const now = new Date();
      const assetName = name?.trim() || `${project.name} · Page ${page.index + 1}`;
      const assetDescription = description?.trim() || "Created with Pigcasso Canvas.";

      const [asset] = await db
        .insert(nftAssets)
        .values({
          userId: auth.id,
          projectId,
          projectPageId,
          chainId: MANTLE_CHAIN_ID,
          status: "draft",
          name: assetName,
          description: assetDescription,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!asset) {
        return c.json({ error: "Failed to create asset" }, 400);
      }

      const imagePinned = await pinFileFromUrlToIpfs({
        url: imageUrl,
        name: `pigcasso-${asset.id}.png`,
      });

      const inputJson = sourceJson ?? page.json;
      let canvasJson: unknown;
      try {
        canvasJson = JSON.parse(inputJson);
      } catch {
        throw new HttpError(400, "Invalid canvas JSON");
      }

      const sourcePinned = await pinJsonToIpfs({
        json: {
          projectId,
          projectPageId,
          pageIndex: page.index,
          canvas: canvasJson,
        },
        name: `pigcasso-${asset.id}-source.json`,
      });

      const metadata = buildNftAssetMetadata({
        name: assetName,
        description: assetDescription,
        projectName: project.name,
        pageIndex: page.index,
        chainLabel: "Mantle",
        imageCid: imagePinned.cid,
        sourceCid: sourcePinned.cid,
        projectId,
        projectPageId,
      });

      const metadataPinned = await pinJsonToIpfs({
        json: metadata,
        name: `pigcasso-${asset.id}-metadata.json`,
      });

      const [updated] = await db
        .update(nftAssets)
        .set({
          imageUri: `ipfs://${imagePinned.cid}`,
          metadataUri: `ipfs://${metadataPinned.cid}`,
          status: "prepared",
          updatedAt: new Date(),
        })
        .where(and(eq(nftAssets.id, asset.id), eq(nftAssets.userId, auth.id)))
        .returning();

      return c.json({ data: updated ?? asset });
    },
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    zValidator(
      "json",
      z
        .object({
          status: z.string().trim().min(1).optional(),
          collectionId: z.string().min(1).nullable().optional(),
          collectionAddress: z
            .string()
            .trim()
            .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid address")
            .nullable()
            .optional(),
          tokenId: z
            .string()
            .trim()
            .regex(/^[0-9]+$/, "Token ID must be numeric")
            .nullable()
            .optional(),
          txHash: z
            .string()
            .trim()
            .regex(/^0x[0-9a-fA-F]{64}$/, "Invalid transaction hash")
            .nullable()
            .optional(),
          metadataUri: z.string().trim().min(1).nullable().optional(),
          imageUri: z.string().trim().min(1).nullable().optional(),
          name: z.string().trim().max(120).nullable().optional(),
          description: z.string().trim().max(500).nullable().optional(),
        })
        .refine((value) => Object.keys(value).length > 0, {
          message: "No changes provided",
        }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      const [updated] = await db
        .update(nftAssets)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(and(eq(nftAssets.id, id), eq(nftAssets.userId, auth.id)))
        .returning();

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: updated });
    },
  );

export default app;
