import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { nftCollections } from "@/db/schema";
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
          id: nftCollections.id,
          chainId: nftCollections.chainId,
          address: nftCollections.address,
          name: nftCollections.name,
          symbol: nftCollections.symbol,
          contractUri: nftCollections.contractUri,
          createdAt: nftCollections.createdAt,
          updatedAt: nftCollections.updatedAt,
        })
        .from(nftCollections)
        .where(eq(nftCollections.userId, auth.id))
        .orderBy(desc(nftCollections.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return c.json({ data });
    },
  )
  .post(
    "/",
    requireAuth,
    zValidator(
      "json",
      z.object({
        chainId: z.coerce.number().int().positive().optional().default(5000),
        name: z.string().trim().min(1).max(120),
        symbol: z
          .string()
          .trim()
          .min(1)
          .max(20)
          .regex(/^[A-Z0-9_]+$/i, "Symbol must be alphanumeric/underscore"),
        contractUri: z.string().trim().url().optional(),
        address: z.string().trim().optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { chainId, name, symbol, contractUri, address } = c.req.valid("json");

      const normalizedAddress = address?.trim();

      const [created] = await db
        .insert(nftCollections)
        .values({
          userId: auth.id,
          chainId,
          name: name.trim(),
          symbol: symbol.trim(),
          contractUri: contractUri?.trim() || null,
          address: normalizedAddress && normalizedAddress.length > 0 ? normalizedAddress : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to create collection" }, 400);
      }

      return c.json({ data: created });
    },
  );

export default app;

