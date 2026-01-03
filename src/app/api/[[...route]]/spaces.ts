import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { getPublicSpaceData } from "@/server/space";
import { requireAuth } from "@/server/hono-auth";
import { getOrCreateSpaceDocumentForUserId, upsertSpaceDocumentForUserId } from "@/server/space-documents";
import { spaceDocumentSchema } from "@/features/spaces/lib/space-document";
import { resolveSpaceNft } from "@/server/space-nft-resolver";

const upsertSchema = z.object({
  document: spaceDocumentSchema,
  isPublished: z.boolean().optional(),
});

const resolveNftSchema = z.object({
  chainId: z.number().int().positive(),
  contractAddress: z.string().trim().min(1),
  tokenId: z.string().trim().min(1),
  walletAddress: z.string().trim().optional().nullable(),
});

const app = new Hono()
  .get("/me", requireAuth, async (c) => {
    const authUser = c.get("authUser");
    const [profile] = await db
      .select({ name: users.name, image: users.image, bio: users.bio })
      .from(users)
      .where(eq(users.id, authUser.id));

    const row = await getOrCreateSpaceDocumentForUserId(authUser.id, {
      displayName: profile?.name ?? null,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.image ?? null,
    });

    return c.json({
      data: {
        document: row.document,
        publishedDocument: row.isPublished ? (row.publishedDocument ?? row.document) : null,
        isPublished: row.isPublished,
        updatedAt: row.updatedAt,
      },
    });
  })
  .post("/nfts/resolve", requireAuth, zValidator("json", resolveNftSchema), async (c) => {
    const authUser = c.get("authUser");
    const body = c.req.valid("json");

    const linkedWallets = [
      authUser.externalWalletAddress,
      ...authUser.externalWalletAddresses,
      authUser.embeddedWalletAddress,
    ];

    const requestedWallet = body.walletAddress?.trim() || null;

    if (requestedWallet) {
      const matches = linkedWallets.some(
        (wallet) => wallet?.toLowerCase() === requestedWallet.toLowerCase(),
      );

      if (!matches) {
        return c.json(
          {
            error: "Wallet address must be linked to your account.",
          },
          400,
        );
      }
    }

    const result = await resolveSpaceNft({
      chainId: body.chainId,
      contractAddress: body.contractAddress,
      tokenId: body.tokenId,
      ownerAddresses: requestedWallet ? [requestedWallet] : linkedWallets,
    });

    return c.json({ data: result });
  })
  .patch("/me", requireAuth, zValidator("json", upsertSchema), async (c) => {
    const authUser = c.get("authUser");
    const { document, isPublished } = c.req.valid("json");

    const row = await upsertSpaceDocumentForUserId({
      userId: authUser.id,
      document,
      isPublished,
    });

    return c.json({
      data: {
        document: row.document,
        publishedDocument: row.isPublished ? (row.publishedDocument ?? row.document) : null,
        isPublished: row.isPublished,
        updatedAt: row.updatedAt,
      },
    });
  })
  .get(
    "/:handle",
    zValidator(
      "param",
      z.object({
        handle: z.string().trim().min(1),
      }),
    ),
    async (c) => {
      const { handle } = c.req.valid("param");
      const data = await getPublicSpaceData(handle);

      if (!data) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data });
    },
  );

export default app;
