import { z } from "zod";
import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projects, projectsInsertSchema } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { getProStatusForUser } from "@/server/token-gating";

const listProjectsSchema = z.object({
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(50),
});

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    json: z.string().optional(),
    width: z.coerce.number().int().min(1).optional(),
    height: z.coerce.number().int().min(1).optional(),
    thumbnailUrl: z.string().trim().url().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No changes provided",
  });

const app = new Hono()
  .delete(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const data = await db
        .delete(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.id),
          ),
        )
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: { id } });
    },
  )
  .post(
    "/:id/publish-template",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        thumbnailUrl: z.string().url().optional(),
        isPro: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const [existing] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!existing) {
        return c.json({ error: "Not found" }, 404);
      }

      const wantsPro = body.isPro === true;
      if (wantsPro) {
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

      const now = new Date();
      const creatorWallet =
        auth.externalWalletAddress ?? auth.embeddedWalletAddress ?? null;

      const [updated] = await db
        .update(projects)
        .set({
          isTemplate: true,
          isPublicTemplate: true,
          isPro: body.isPro === false ? false : wantsPro ? true : existing.isPro,
          thumbnailUrl: body.thumbnailUrl ?? existing.thumbnailUrl,
          creatorWallet: creatorWallet ?? existing.creatorWallet,
          publishedAt: existing.publishedAt ?? now,
          updatedAt: now,
        })
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)))
        .returning();

      if (!updated) {
        return c.json({ error: "Failed to publish" }, 400);
      }

      return c.json({
        data: updated,
        sharePath: `/templates/${updated.id}`,
      });
    },
  )
  .post(
    "/:id/duplicate",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const data = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.id),
          ),
        );

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      const project = data[0];

      const duplicateData = await db
        .insert(projects)
        .values({
          name: `Copy of ${project.name}`,
          json: project.json,
          width: project.width,
          height: project.height,
          userId: auth.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return c.json({ data: duplicateData[0] });
    },
  )
  .get(
    "/",
    requireAuth,
    zValidator("query", listProjectsSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { page, limit } = c.req.valid("query");

      const data = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, auth.id))
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy(desc(projects.updatedAt));

      return c.json({
        data,
        nextPage: data.length === limit ? page + 1 : null,
      });
    },
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator(
      "param",
      z.object({ id: z.string() }),
    ),
    zValidator("json", updateProjectSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      const data = await db
        .update(projects)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.id),
          ),
        )
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: data[0] });
    },
  )
  .get(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const data = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.userId, auth.id)
          )
        );

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: data[0] });
    },
  )
  .post(
    "/",
    requireAuth,
    zValidator(
      "json",
      projectsInsertSchema.pick({
        name: true,
        json: true,
        width: true,
        height: true,
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { name, json, height, width } = c.req.valid("json");

      const data = await db
        .insert(projects)
        .values({
          name,
          json,
          width,
          height,
          userId: auth.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!data[0]) {
        return c.json({ error: "Something went wrong" }, 400);
      }

      return c.json({ data: data[0] });
    },
  );

export default app;
