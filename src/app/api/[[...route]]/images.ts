import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { getUnsplashClient, hasUnsplashConfigured } from "@/lib/unsplash";
import { requireAuth } from "@/server/hono-auth";

const DEFAULT_LIMIT = 24;

const listImagesSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(DEFAULT_LIMIT),
});

const app = new Hono()
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
