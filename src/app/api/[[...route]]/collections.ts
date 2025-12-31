import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { nftCollections } from "@/db/schema";
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
        chainId: z.coerce.number().int().positive().optional().default(MANTLE_CHAIN_ID),
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
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string().min(1) })),
    zValidator(
      "json",
      z
        .object({
          address: z
            .string()
            .trim()
            .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid address")
            .optional(),
          contractUri: z.string().trim().url().nullable().optional(),
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
        .update(nftCollections)
        .set({
          ...(values.address !== undefined ? { address: values.address } : {}),
          ...(values.contractUri !== undefined ? { contractUri: values.contractUri } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(nftCollections.id, id), eq(nftCollections.userId, auth.id)))
        .returning();

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: updated });
    },
  );

export default app;
