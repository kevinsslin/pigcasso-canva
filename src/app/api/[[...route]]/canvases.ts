import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { requireAuth } from "@/server/hono-auth";
import {
  getCanvasDocumentForUserId,
  getOrCreateCanvasDocumentForUserId,
  listCanvasDocumentsForUserId,
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
  );

export default app;
