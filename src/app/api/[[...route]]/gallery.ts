import { Hono, type Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

import { requireAuth } from "@/server/hono-auth";
import { getBearerToken, getOrCreateUserFromPrivyToken } from "@/server/auth";
import {
  getPublishedCanvas,
  listPublishedCanvases,
  toggleCanvasBookmark,
  toggleCanvasLike,
  type CanvasGallerySort,
} from "@/server/canvas-gallery";

const listSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(48).optional().default(24),
  sort: z.enum(["new", "top"]).optional().default("new"),
});

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const getViewerUserId = async (c: Context) => {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) return null;
  const viewer = await getOrCreateUserFromPrivyToken(token);
  return viewer.id;
};

const app = new Hono()
  .get("/canvases", zValidator("query", listSchema), async (c) => {
    const { page, limit, sort } = c.req.valid("query");
    const viewerUserId = await getViewerUserId(c);

    const data = await listPublishedCanvases({
      page,
      limit,
      sort: sort as CanvasGallerySort,
      viewerUserId,
    });

    return c.json({
      data,
      nextPage: data.length === limit ? page + 1 : null,
    });
  })
  .get("/canvases/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const viewerUserId = await getViewerUserId(c);
    const data = await getPublishedCanvas({ id, viewerUserId });
    if (!data) {
      return c.json({ error: "Not found" }, 404);
    }
    return c.json({ data });
  })
  .post("/canvases/:id/like", requireAuth, zValidator("param", idParamSchema), async (c) => {
    const authUser = c.get("authUser");
    const { id } = c.req.valid("param");
    const data = await toggleCanvasLike({ canvasId: id, userId: authUser.id });
    return c.json({ data });
  })
  .post("/canvases/:id/bookmark", requireAuth, zValidator("param", idParamSchema), async (c) => {
    const authUser = c.get("authUser");
    const { id } = c.req.valid("param");
    const data = await toggleCanvasBookmark({ canvasId: id, userId: authUser.id });
    return c.json({ data });
  });

export default app;
