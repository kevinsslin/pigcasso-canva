import { z } from "zod";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { getAiLimitsForUser, getAiUsageRowForToday } from "@/server/ai-usage";
import { getProStatusForUser } from "@/server/token-gating";
import { hasUnsplashConfigured } from "@/lib/unsplash";

const updateMeSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    image: z.string().trim().optional(),
    bio: z.string().trim().max(280).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.image !== undefined || value.bio !== undefined,
    {
      message: "No changes provided",
    },
  );

const app = new Hono()
  .get("/", requireAuth, async (c) => {
    const authUser = c.get("authUser");

    const [dbUser] = await db
      .select({
        name: users.name,
        image: users.image,
        bio: users.bio,
      })
      .from(users)
      .where(eq(users.id, authUser.id));

    const pro = await getProStatusForUser({
      userId: authUser.id,
      embeddedWalletAddress: authUser.embeddedWalletAddress,
      externalWalletAddress: authUser.externalWalletAddress,
    });

    const usage = await getAiUsageRowForToday(authUser.id);
    const limits = getAiLimitsForUser(pro.isPro);

    const aiConfigured = Boolean(process.env.GEMINI_API_KEY);

    return c.json({
      data: {
        user: {
          id: authUser.id,
          privyUserId: authUser.privyUserId,
          email: authUser.email,
          name: dbUser?.name ?? null,
          image: dbUser?.image ?? null,
          bio: dbUser?.bio ?? null,
          wallets: {
            embedded: authUser.embeddedWalletAddress,
            external: authUser.externalWalletAddress,
          },
        },
        integrations: {
          uploadthing: {
            configured: Boolean(process.env.UPLOADTHING_TOKEN),
          },
          unsplash: {
            configured: hasUnsplashConfigured(),
          },
        },
        pro,
        ai: {
          provider: "gemini" as const,
          configured: aiConfigured,
          limits,
          usage: usage
            ? {
                date: usage.date,
                generateCount: usage.generateCount,
                removeBgCount: usage.removeBgCount,
              }
            : null,
        },
      },
    });
  })
  .patch(
    "/",
    requireAuth,
    zValidator("json", updateMeSchema),
    async (c) => {
      const authUser = c.get("authUser");
      const values = c.req.valid("json");

      const next: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (values.name !== undefined) {
        const trimmed = values.name.trim();
        next.name = trimmed.length > 0 ? trimmed : null;
      }

      if (values.image !== undefined) {
        const trimmed = values.image.trim();
        if (!trimmed) {
          next.image = null;
        } else {
          try {
            new URL(trimmed);
          } catch {
            return c.json({ error: "Invalid image URL" }, 400);
          }
          next.image = trimmed;
        }
      }

      if (values.bio !== undefined) {
        const trimmed = values.bio.trim();
        next.bio = trimmed.length > 0 ? trimmed : null;
      }

      const [updated] = await db
        .update(users)
        .set(next)
        .where(eq(users.id, authUser.id))
        .returning({
          id: users.id,
          privyUserId: users.privyUserId,
          email: users.email,
          name: users.name,
          image: users.image,
          bio: users.bio,
          embeddedWalletAddress: users.embeddedWalletAddress,
          externalWalletAddress: users.externalWalletAddress,
        });

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({
        data: {
          user: {
            id: updated.id,
            privyUserId: updated.privyUserId,
            email: updated.email,
            name: updated.name,
            image: updated.image,
            bio: updated.bio,
            wallets: {
              embedded: updated.embeddedWalletAddress,
              external: updated.externalWalletAddress,
            },
          },
        },
      });
    },
  );

export default app;
