import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { getUnsplashClient, hasUnsplashConfigured } from "@/lib/unsplash";
import { requireAuth } from "@/server/hono-auth";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";
import { HttpError } from "@/server/http-error";

const DEFAULT_LIMIT = 24;

const listImagesSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(DEFAULT_LIMIT),
});

const proxyImageSchema = z.object({
  url: z.string().trim().min(1),
});

const app = new Hono()
  .get("/proxy", zValidator("query", proxyImageSchema), async (c) => {
    const { url: rawUrl } = c.req.valid("query");
    const url = assertSafeRemoteUrl(rawUrl, "Invalid proxy URL");

    const upstream = await fetch(url.toString());
    if (!upstream.ok) {
      throw new HttpError(502, `Upstream returned ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const cacheControl = upstream.headers.get("cache-control") ?? "public, max-age=31536000, immutable";

    return c.body(upstream.body, 200, {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "X-Content-Type-Options": "nosniff",
    });
  })
  .get("/", requireAuth, zValidator("query", listImagesSchema), async (c) => {
    const { q, page, limit } = c.req.valid("query");

    if (!hasUnsplashConfigured()) {
      return c.json(
        { error: "Stock images are currently unavailable." },
        501,
      );
    }

    const query = q?.trim();
    if (!query) {
      return c.json({ data: [], nextPage: null });
    }

    const unsplash = getUnsplashClient();
    const images = await unsplash.search.getPhotos({
      query,
      page,
      perPage: limit,
    });

    if (images.errors) {
      return c.json(
        { error: images.errors.join(", ") || "Unsplash error" },
        502,
      );
    }

    const response = images.response;
    const results = response?.results ?? [];
    const totalPages = response?.total_pages ?? page;

    return c.json({
      data: results,
      nextPage: page < totalPages ? page + 1 : null,
    });
  });

export default app;
