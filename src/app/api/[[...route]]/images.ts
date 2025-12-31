import { Hono } from "hono";

import { getUnsplashClient, hasUnsplashConfigured } from "@/lib/unsplash";
import { requireAuth } from "@/server/hono-auth";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];

const app = new Hono()
  .get("/", requireAuth, async (c) => {
    if (!hasUnsplashConfigured()) {
      return c.json(
        { error: "Stock images are currently unavailable." },
        501,
      );
    }

    const unsplash = getUnsplashClient();
    const images = await unsplash.photos.getRandom({
      collectionIds: DEFAULT_COLLECTION_IDS,
      count: DEFAULT_COUNT,
    });

    if (images.errors) {
      return c.json(
        { error: images.errors.join(", ") || "Unsplash error" },
        502,
      );
    }

    let response = images.response;

    if (!Array.isArray(response)) {
      response = [response];
    }

    return c.json({ data: response });
  });

export default app;
