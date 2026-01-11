import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { requireAuth } from "@/server/hono-auth";
import { buildCanvasNftMetadata } from "@/server/canvas-nft-metadata";
import { hasIpfsConfigured, pinFileFromUrlToIpfs, pinJsonToIpfs } from "@/server/ipfs";
import { getIpfsGatewayBaseUrl } from "@/lib/ipfs-gateway";
import { normalizeIpfsUrl } from "@/lib/ipfs";
import {
  getCanvasDocumentForUserId,
  getOrCreateCanvasDocumentForUserId,
  listCanvasDocumentsForUserId,
  publishCanvasDocumentForUserId,
  unpublishCanvasDocumentForUserId,
  updateCanvasDocumentForUserId,
} from "@/server/canvas-documents";

const listSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

const createSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    snapshot: z.string().min(1).nullable().optional(),
    chatJson: z.string().min(1).nullable().optional(),
    coverImageUrl: z.string().trim().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No changes provided",
  });

const publishSchema = z.object({
  isPublished: z.boolean(),
});

const exportNftSchema = z.object({
  imageUrl: z.string().trim().url(),
  shapeId: z.string().trim().min(1).optional(),
  name: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
});

const cidToGatewayUrl = (cid: string) =>
  normalizeIpfsUrl(`ipfs://${cid}`, { defaultGatewayBaseUrl: getIpfsGatewayBaseUrl() });

const app = new Hono()
  .get("/", requireAuth, zValidator("query", listSchema), async (c) => {
    const auth = c.get("authUser");
    const { page, limit } = c.req.valid("query");

    const data = await listCanvasDocumentsForUserId({
      userId: auth.id,
      page,
      limit,
    });

    return c.json({
      data,
      nextPage: data.length === limit ? page + 1 : null,
    });
  })
  .post("/", requireAuth, zValidator("json", createSchema), async (c) => {
    const auth = c.get("authUser");
    const { id, name } = c.req.valid("json");

    const canvasId = id ?? crypto.randomUUID();

    const doc = await getOrCreateCanvasDocumentForUserId({
      userId: auth.id,
      id: canvasId,
      name,
    });

    return c.json({ data: doc });
  })
  .get("/:id", requireAuth, zValidator("param", z.object({ id: z.string().min(1) })), async (c) => {
    const auth = c.get("authUser");
    const { id } = c.req.valid("param");

    const doc = await getCanvasDocumentForUserId({ userId: auth.id, id });
    if (!doc) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.json({ data: doc });
  })
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    zValidator("json", updateSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      const updated = await updateCanvasDocumentForUserId({
        userId: auth.id,
        id,
        values,
      });

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: updated });
    },
  )
  .post(
    "/:id/nft/export",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    zValidator("json", exportNftSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const { imageUrl, shapeId, name, description } = c.req.valid("json");

      if (!hasIpfsConfigured()) {
        return c.json({ error: "IPFS pinning is currently unavailable." }, 501);
      }

      const doc = await getCanvasDocumentForUserId({ userId: auth.id, id });
      if (!doc) {
        return c.json({ error: "Not found" }, 404);
      }

      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, "-");
      const assetName = name?.trim() || `${doc.name} · ${stamp.slice(0, 10)}`;
      const assetDescription = description?.trim() || "Created with Pigcasso Canvas.";

      const imagePinned = await pinFileFromUrlToIpfs({
        url: imageUrl,
        name: `pigcasso-${id}-${stamp}.png`,
      });

      const sourcePinned = await pinJsonToIpfs({
        json: {
          canvasId: id,
          canvasName: doc.name,
          shapeId: shapeId ?? null,
          imageUrl,
          exportedAt: now.toISOString(),
        },
        name: `pigcasso-${id}-${stamp}-source.json`,
      });

      const metadata = buildCanvasNftMetadata({
        name: assetName,
        description: assetDescription,
        canvasId: id,
        canvasName: doc.name,
        imageCid: imagePinned.cid,
        sourceCid: sourcePinned.cid,
        shapeId: shapeId ?? null,
        chainLabel: "Mantle",
      });

      const metadataPinned = await pinJsonToIpfs({
        json: metadata,
        name: `pigcasso-${id}-${stamp}-metadata.json`,
      });

      return c.json({
        data: {
          name: assetName,
          description: assetDescription,
          imageCid: imagePinned.cid,
          metadataCid: metadataPinned.cid,
          imageUri: `ipfs://${imagePinned.cid}`,
          metadataUri: `ipfs://${metadataPinned.cid}`,
          imageUrl: cidToGatewayUrl(imagePinned.cid),
          metadataUrl: cidToGatewayUrl(metadataPinned.cid),
        },
      });
    },
  )
  .patch(
    "/:id/publish",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    zValidator("json", publishSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const { isPublished } = c.req.valid("json");

      const updated = isPublished
        ? await publishCanvasDocumentForUserId({ userId: auth.id, id })
        : await unpublishCanvasDocumentForUserId({ userId: auth.id, id });

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: updated });
    },
  );

export default app;
