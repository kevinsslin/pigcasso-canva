import { z } from "zod";
import { Hono } from "hono";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projectPages, projects } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { HttpError } from "@/server/http-error";
import { getProStatusForUser } from "@/server/token-gating";

const listProjectsSchema = z.object({
  page: z.coerce.number().min(1),
  limit: z.coerce.number().min(1).max(50),
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  json: z.string().optional().default(""),
  width: z.coerce.number().int().min(1),
  height: z.coerce.number().int().min(1),
});

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No changes provided",
  });

const updateProjectPageSchema = z
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

const createProjectPageSchema = z.object({
  sourcePageId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  json: z.string().optional(),
  width: z.coerce.number().int().min(1).optional(),
  height: z.coerce.number().int().min(1).optional(),
});

const app = new Hono()
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
  .post(
    "/",
    requireAuth,
    zValidator("json", createProjectSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { name, json, height, width } = c.req.valid("json");

      const now = new Date();
      const [project] = await db
        .insert(projects)
        .values({
          name,
          width,
          height,
          userId: auth.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!project) {
        return c.json({ error: "Something went wrong" }, 400);
      }

      await db.insert(projectPages).values({
        id: project.id,
        projectId: project.id,
        index: 0,
        name: "Page 1",
        json,
        width,
        height,
        thumbnailUrl: null,
        createdAt: now,
        updatedAt: now,
      });

      return c.json({ data: project });
    },
  )
  .get(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const pages = await db
        .select({
          id: projectPages.id,
          projectId: projectPages.projectId,
          index: projectPages.index,
          name: projectPages.name,
          json: projectPages.json,
          width: projectPages.width,
          height: projectPages.height,
          thumbnailUrl: projectPages.thumbnailUrl,
          createdAt: projectPages.createdAt,
          updatedAt: projectPages.updatedAt,
        })
        .from(projectPages)
        .where(eq(projectPages.projectId, id))
        .orderBy(asc(projectPages.index));

      return c.json({ data: { ...project, pages } });
    },
  )
  .patch(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
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
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)))
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: data[0] });
    },
  )
  .delete(
    "/:id",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const data = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)))
        .returning();

      if (data.length === 0) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: { id } });
    },
  )
  .get(
    "/:id/pages",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const pages = await db
        .select({
          id: projectPages.id,
          projectId: projectPages.projectId,
          index: projectPages.index,
          name: projectPages.name,
          json: projectPages.json,
          width: projectPages.width,
          height: projectPages.height,
          thumbnailUrl: projectPages.thumbnailUrl,
          createdAt: projectPages.createdAt,
          updatedAt: projectPages.updatedAt,
        })
        .from(projectPages)
        .where(eq(projectPages.projectId, id))
        .orderBy(asc(projectPages.index));

      return c.json({ data: pages });
    },
  )
  .post(
    "/:id/pages",
    requireAuth,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", createProjectPageSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const [project] = await db
        .select({ id: projects.id, width: projects.width, height: projects.height })
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const [row] = await db
        .select({
          maxIndex: sql<number>`max(${projectPages.index})`.mapWith(Number),
        })
        .from(projectPages)
        .where(eq(projectPages.projectId, id));

      const nextIndex = (row?.maxIndex ?? -1) + 1;

      let initial = {
        json: body.json ?? "",
        width: body.width ?? project.width,
        height: body.height ?? project.height,
        name: body.name?.trim() ?? `Page ${nextIndex + 1}`,
        thumbnailUrl: null as string | null,
      };

      if (body.sourcePageId) {
        const [source] = await db
          .select({
            json: projectPages.json,
            width: projectPages.width,
            height: projectPages.height,
            thumbnailUrl: projectPages.thumbnailUrl,
            name: projectPages.name,
          })
          .from(projectPages)
          .where(and(eq(projectPages.id, body.sourcePageId), eq(projectPages.projectId, id)));

        if (!source) {
          return c.json({ error: "Source page not found" }, 404);
        }

        initial = {
          json: source.json,
          width: source.width,
          height: source.height,
          name:
            body.name?.trim() ??
            (source.name ? `Copy of ${source.name}` : `Page ${nextIndex + 1}`),
          thumbnailUrl: source.thumbnailUrl,
        };
      }

      const [created] = await db
        .insert(projectPages)
        .values({
          projectId: id,
          index: nextIndex,
          name: initial.name,
          json: initial.json,
          width: initial.width,
          height: initial.height,
          thumbnailUrl: initial.thumbnailUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        return c.json({ error: "Failed to create page" }, 400);
      }

      await db
        .update(projects)
        .set({ updatedAt: new Date() })
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      return c.json({ data: created }, 201);
    },
  )
  .patch(
    "/:id/pages/:pageId",
    requireAuth,
    zValidator("param", z.object({ id: z.string(), pageId: z.string() })),
    zValidator("json", updateProjectPageSchema),
    async (c) => {
      const auth = c.get("authUser");
      const { id, pageId } = c.req.valid("param");
      const values = c.req.valid("json");

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      let updatedPage: (typeof projectPages.$inferSelect) | undefined;
      try {
        [updatedPage] = await db
          .update(projectPages)
          .set({
            ...values,
            updatedAt: new Date(),
          })
          .where(and(eq(projectPages.id, pageId), eq(projectPages.projectId, id)))
          .returning();
      } catch (error) {
        console.error(error);
        throw new HttpError(500, "Failed to save page");
      }

      if (!updatedPage) {
        return c.json({ error: "Not found" }, 404);
      }

      const now = new Date();
      try {
        await db
          .update(projects)
          .set({
            updatedAt: now,
            ...(updatedPage.index === 0
              ? {
                  ...(values.width !== undefined ? { width: values.width } : {}),
                  ...(values.height !== undefined ? { height: values.height } : {}),
                  ...(values.thumbnailUrl !== undefined
                    ? { thumbnailUrl: values.thumbnailUrl }
                    : {}),
                }
              : {}),
          })
          .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));
      } catch (error) {
        console.error(error);
        throw new HttpError(500, "Failed to save page");
      }

      return c.json({ data: updatedPage });
    },
  )
  .delete(
    "/:id/pages/:pageId",
    requireAuth,
    zValidator("param", z.object({ id: z.string(), pageId: z.string() })),
    async (c) => {
      const auth = c.get("authUser");
      const { id, pageId } = c.req.valid("param");

      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const [page] = await db
        .select({
          id: projectPages.id,
          index: projectPages.index,
        })
        .from(projectPages)
        .where(and(eq(projectPages.id, pageId), eq(projectPages.projectId, id)));

      if (!page) {
        return c.json({ error: "Not found" }, 404);
      }

      const [countRow] = await db
        .select({
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(projectPages)
        .where(eq(projectPages.projectId, id));

      const pageCount = countRow?.count ?? 0;
      if (pageCount <= 1) {
        return c.json({ error: "Project must have at least one page" }, 400);
      }

      await db
        .delete(projectPages)
        .where(and(eq(projectPages.id, pageId), eq(projectPages.projectId, id)));

      await db
        .update(projectPages)
        .set({
          index: sql`${projectPages.index} - 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(projectPages.projectId, id), gt(projectPages.index, page.index)));

      const now = new Date();
      if (page.index === 0) {
        const [nextCover] = await db
          .select({
            width: projectPages.width,
            height: projectPages.height,
            thumbnailUrl: projectPages.thumbnailUrl,
          })
          .from(projectPages)
          .where(eq(projectPages.projectId, id))
          .orderBy(asc(projectPages.index))
          .limit(1);

        await db
          .update(projects)
          .set({
            updatedAt: now,
            ...(nextCover?.width ? { width: nextCover.width } : {}),
            ...(nextCover?.height ? { height: nextCover.height } : {}),
            thumbnailUrl: nextCover?.thumbnailUrl ?? null,
          })
          .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));
      } else {
        await db
          .update(projects)
          .set({ updatedAt: now })
          .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));
      }

      return c.json({ data: { id: pageId } });
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
      const creatorWallet = auth.externalWalletAddress ?? auth.embeddedWalletAddress ?? null;

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

      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, auth.id)));

      if (!project) {
        return c.json({ error: "Not found" }, 404);
      }

      const pages = await db
        .select()
        .from(projectPages)
        .where(eq(projectPages.projectId, id))
        .orderBy(asc(projectPages.index));

      const now = new Date();
      const [createdProject] = await db
        .insert(projects)
        .values({
          name: `Copy of ${project.name}`,
          width: project.width,
          height: project.height,
          thumbnailUrl: project.thumbnailUrl,
          userId: auth.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!createdProject) {
        return c.json({ error: "Failed to duplicate" }, 400);
      }

      const pageRows = pages.length
        ? pages.map((page) => ({
            ...(page.index === 0 ? { id: createdProject.id } : {}),
            projectId: createdProject.id,
            index: page.index,
            name: page.name,
            json: page.json,
            width: page.width,
            height: page.height,
            thumbnailUrl: page.thumbnailUrl,
            createdAt: now,
            updatedAt: now,
          }))
        : [
            {
              id: createdProject.id,
              projectId: createdProject.id,
              index: 0,
              name: "Page 1",
              json: "",
              width: createdProject.width,
              height: createdProject.height,
              thumbnailUrl: createdProject.thumbnailUrl,
              createdAt: now,
              updatedAt: now,
            },
          ];

      await db.insert(projectPages).values(pageRows);

      return c.json({ data: createdProject });
    },
  );

export default app;
