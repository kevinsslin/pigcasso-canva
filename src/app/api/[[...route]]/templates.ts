import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projects } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { getProStatusForUser } from "@/server/token-gating";

const app = new Hono()
  .get(
    "/",
    requireAuth,
    zValidator(
      "query",
      z.object({
        page: z.coerce.number().min(1),
        limit: z.coerce.number().min(1).max(50),
      }),
    ),
    async (c) => {
      const { page, limit } = c.req.valid("query");

      const data = await db
        .select({
          id: projects.id,
          name: projects.name,
          width: projects.width,
          height: projects.height,
          thumbnailUrl: projects.thumbnailUrl,
          isPro: projects.isPro,
          creatorWallet: projects.creatorWallet,
          parentProjectId: projects.parentProjectId,
          publishedAt: projects.publishedAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(and(eq(projects.isTemplate, true), eq(projects.isPublicTemplate, true)))
        .orderBy(desc(projects.publishedAt), desc(projects.updatedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return c.json({
        data,
        nextPage: data.length === limit ? page + 1 : null,
      });
    },
  )
  .get(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const [template] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.isTemplate, true), eq(projects.isPublicTemplate, true)));

      if (!template) {
        return c.json({ error: "Not found" }, 404);
      }

      const pro = template.isPro
        ? await getProStatusForUser({
            userId: auth.id,
            embeddedWalletAddress: auth.embeddedWalletAddress,
            externalWalletAddresses: auth.externalWalletAddresses,
            externalWalletAddress: auth.externalWalletAddress,
          })
        : { isPro: true };

      const locked = template.isPro && !pro.isPro;

      return c.json({
        data: {
          ...template,
          json: locked ? null : template.json,
        },
        locked,
      });
    },
  )
  .post(
    "/:id/remix",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const [template] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.isTemplate, true), eq(projects.isPublicTemplate, true)));

      if (!template) {
        return c.json({ error: "Not found" }, 404);
      }

      if (template.isPro) {
        const pro = await getProStatusForUser({
          userId: auth.id,
          embeddedWalletAddress: auth.embeddedWalletAddress,
          externalWalletAddresses: auth.externalWalletAddresses,
          externalWalletAddress: auth.externalWalletAddress,
        });

        if (!pro.isPro) {
          return c.json({ error: "Pro required" }, 403);
        }
      }

      const [created] = await db
        .insert(projects)
        .values({
          name: `Remix of ${template.name}`,
          json: template.json,
          width: template.width,
          height: template.height,
          userId: auth.id,
          parentProjectId: template.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to remix" }, 400);
      }

      return c.json({ data: created });
    },
  );

export default app;
