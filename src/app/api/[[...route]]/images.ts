import { Hono } from "hono";

import { unsplash } from "@/lib/unsplash";
import { requireAuth } from "@/server/hono-auth";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];

const app = new Hono()
  .get("/", requireAuth, async (c) => {
    if (!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) {
      return c.json(
        { error: "Stock images are currently unavailable." },
        501,
      );
    }

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
