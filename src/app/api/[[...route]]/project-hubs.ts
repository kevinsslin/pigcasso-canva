import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projectHubs, projects, templateTokens, templateUsageEvents, users } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const projectHubSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .transform((value) => value.toLowerCase());

const slugParamSchema = z.object({ slug: projectHubSlugSchema });

const templatesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  category: z.string().trim().optional(),
});

const nullableTrimmedText = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }, schema.nullable().optional());

const nullableUrl = nullableTrimmedText(z.string().url());

const createHubSchema = z.object({
  slug: projectHubSlugSchema,
  name: z.string().trim().min(1).max(80),
  description: nullableTrimmedText(z.string().max(280)),
  logoUrl: nullableUrl,
  bannerUrl: nullableUrl,
  websiteUrl: nullableUrl,
  xUrl: nullableUrl,
  discordUrl: nullableUrl,
  telegramUrl: nullableUrl,
  ownerId: nullableTrimmedText(z.string()),
});

const updateHubSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: nullableTrimmedText(z.string().max(280)),
    logoUrl: nullableUrl,
    bannerUrl: nullableUrl,
    websiteUrl: nullableUrl,
    xUrl: nullableUrl,
    discordUrl: nullableUrl,
    telegramUrl: nullableUrl,
    ownerId: nullableTrimmedText(z.string()),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "No changes provided",
  });

const templateCategorySchema = z.enum(["avatar", "sticker", "seasonal", "campaign", "other"]);

const templateAssignmentParamsSchema = z.object({
  slug: projectHubSlugSchema,
  templateId: z.string().min(1),
});

const templateAssignmentSchema = z.object({
  templateCategory: templateCategorySchema,
});

const requireProjectHubAdmin = createMiddleware(async (c, next) => {
  const expected = process.env.PROJECT_HUB_ADMIN_TOKEN;
  if (!expected) {
    return c.json({ error: "Project hub admin token is not configured" }, 501);
  }

  const token = c.req.header("x-admin-token");
  if (!token || token !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
});

const app = new Hono()
  .get("/", requireAuth, zValidator("query", listQuerySchema), async (c) => {
    const { page, limit } = c.req.valid("query");

    const data = await db
      .select({
        id: projectHubs.id,
        slug: projectHubs.slug,
        name: projectHubs.name,
        description: projectHubs.description,
        logoUrl: projectHubs.logoUrl,
        bannerUrl: projectHubs.bannerUrl,
        websiteUrl: projectHubs.websiteUrl,
        xUrl: projectHubs.xUrl,
        discordUrl: projectHubs.discordUrl,
        telegramUrl: projectHubs.telegramUrl,
        templatesCount: sql<number>`count(distinct ${projects.id})`.mapWith(Number),
        remixCount: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
        updatedAt: projectHubs.updatedAt,
      })
      .from(projectHubs)
      .leftJoin(
        projects,
        and(
          eq(projects.projectHubId, projectHubs.id),
          eq(projects.isTemplate, true),
          eq(projects.isPublicTemplate, true),
        ),
      )
      .leftJoin(
        templateUsageEvents,
        and(
          eq(templateUsageEvents.templateProjectId, projects.id),
          eq(templateUsageEvents.type, "remix"),
        ),
      )
      .groupBy(projectHubs.id)
      .orderBy(desc(projectHubs.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return c.json({
      data: data.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        logoUrl: row.logoUrl,
        bannerUrl: row.bannerUrl,
        links: {
          website: row.websiteUrl,
          x: row.xUrl,
          discord: row.discordUrl,
          telegram: row.telegramUrl,
        },
        stats: {
          templatesCount: row.templatesCount ?? 0,
          remixCount: row.remixCount ?? 0,
        },
        updatedAt: row.updatedAt,
      })),
      nextPage: data.length === limit ? page + 1 : null,
    });
  })
  .post("/", requireProjectHubAdmin, zValidator("json", createHubSchema), async (c) => {
    const values = c.req.valid("json");
    const now = new Date();

    const [created] = await db
      .insert(projectHubs)
      .values({
        slug: values.slug,
        name: values.name,
        description: values.description ?? null,
        logoUrl: values.logoUrl ?? null,
        bannerUrl: values.bannerUrl ?? null,
        websiteUrl: values.websiteUrl ?? null,
        xUrl: values.xUrl ?? null,
        discordUrl: values.discordUrl ?? null,
        telegramUrl: values.telegramUrl ?? null,
        ownerId: values.ownerId ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      return c.json({ error: "Failed to create project" }, 400);
    }

    return c.json({
      data: {
        id: created.id,
        slug: created.slug,
      },
    });
  })
  .get("/:slug", requireAuth, zValidator("param", slugParamSchema), async (c) => {
    const { slug } = c.req.valid("param");

    const [hub] = await db
      .select()
      .from(projectHubs)
      .where(eq(projectHubs.slug, slug))
      .limit(1);

    if (!hub) {
      return c.json({ error: "Not found" }, 404);
    }

    const [stats] = await db
      .select({
        templatesCount: sql<number>`count(distinct ${projects.id})`.mapWith(Number),
        remixCount: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
      })
      .from(projectHubs)
      .leftJoin(
        projects,
        and(
          eq(projects.projectHubId, projectHubs.id),
          eq(projects.isTemplate, true),
          eq(projects.isPublicTemplate, true),
        ),
      )
      .leftJoin(
        templateUsageEvents,
        and(
          eq(templateUsageEvents.templateProjectId, projects.id),
          eq(templateUsageEvents.type, "remix"),
        ),
      )
      .where(eq(projectHubs.slug, slug))
      .groupBy(projectHubs.id);

    return c.json({
      data: {
        id: hub.id,
        slug: hub.slug,
        name: hub.name,
        description: hub.description,
        logoUrl: hub.logoUrl,
        bannerUrl: hub.bannerUrl,
        links: {
          website: hub.websiteUrl,
          x: hub.xUrl,
          discord: hub.discordUrl,
          telegram: hub.telegramUrl,
        },
        stats: {
          templatesCount: stats?.templatesCount ?? 0,
          remixCount: stats?.remixCount ?? 0,
        },
        createdAt: hub.createdAt,
        updatedAt: hub.updatedAt,
      },
    });
  })
  .patch(
    "/:slug",
    requireProjectHubAdmin,
    zValidator("param", slugParamSchema),
    zValidator("json", updateHubSchema),
    async (c) => {
      const { slug } = c.req.valid("param");
      const values = c.req.valid("json");

      const next: Partial<typeof projectHubs.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (values.name !== undefined) next.name = values.name;
      if (values.description !== undefined) next.description = values.description;
      if (values.logoUrl !== undefined) next.logoUrl = values.logoUrl;
      if (values.bannerUrl !== undefined) next.bannerUrl = values.bannerUrl;
      if (values.websiteUrl !== undefined) next.websiteUrl = values.websiteUrl;
      if (values.xUrl !== undefined) next.xUrl = values.xUrl;
      if (values.discordUrl !== undefined) next.discordUrl = values.discordUrl;
      if (values.telegramUrl !== undefined) next.telegramUrl = values.telegramUrl;
      if (values.ownerId !== undefined) next.ownerId = values.ownerId;

      const [updated] = await db
        .update(projectHubs)
        .set(next)
        .where(eq(projectHubs.slug, slug))
        .returning();

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({
        data: {
          id: updated.id,
          slug: updated.slug,
        },
      });
    },
  )
  .get(
    "/:slug/templates",
    requireAuth,
    zValidator("param", slugParamSchema),
    zValidator("query", templatesQuerySchema),
    async (c) => {
      const { slug } = c.req.valid("param");
      const { page, limit, category } = c.req.valid("query");

      const [hub] = await db
        .select({ id: projectHubs.id })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      const whereConditions = [
        eq(projects.projectHubId, hub.id),
        eq(projects.isTemplate, true),
        eq(projects.isPublicTemplate, true),
      ];
      if (category?.trim()) {
        whereConditions.push(eq(projects.templateCategory, category.trim()));
      }

      const rows = await db
        .select({
          id: projects.id,
          name: projects.name,
          width: projects.width,
          height: projects.height,
          thumbnailUrl: projects.thumbnailUrl,
          isPro: projects.isPro,
          templateCategory: projects.templateCategory,
          creatorWallet: projects.creatorWallet,
          parentProjectId: projects.parentProjectId,
          publishedAt: projects.publishedAt,
          updatedAt: projects.updatedAt,
          token: {
            printrTokenId: templateTokens.printrTokenId,
            status: templateTokens.status,
          },
        })
        .from(projects)
        .leftJoin(templateTokens, eq(templateTokens.templateProjectId, projects.id))
        .where(and(...whereConditions))
        .orderBy(desc(projects.publishedAt), desc(projects.updatedAt))
        .limit(limit)
        .offset((page - 1) * limit);

      return c.json({
        data: rows.map((row) => ({
          ...row,
          token: {
            printrTokenId: row.token?.printrTokenId ?? null,
            status: row.token?.status ?? null,
          },
        })),
        nextPage: rows.length === limit ? page + 1 : null,
      });
    },
  )
  .patch(
    "/:slug/templates/:templateId",
    requireProjectHubAdmin,
    zValidator("param", templateAssignmentParamsSchema),
    zValidator("json", templateAssignmentSchema),
    async (c) => {
      const { slug, templateId } = c.req.valid("param");
      const { templateCategory } = c.req.valid("json");

      const [hub] = await db
        .select({ id: projectHubs.id })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      const [template] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, templateId))
        .limit(1);

      if (!template) {
        return c.json({ error: "Template not found" }, 404);
      }

      const [updated] = await db
        .update(projects)
        .set({
          projectHubId: hub.id,
          templateCategory,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, templateId))
        .returning({
          id: projects.id,
          projectHubId: projects.projectHubId,
          templateCategory: projects.templateCategory,
        });

      if (!updated) {
        return c.json({ error: "Failed to assign template" }, 400);
      }

      return c.json({ data: updated });
    },
  )
  .delete(
    "/:slug/templates/:templateId",
    requireProjectHubAdmin,
    zValidator("param", templateAssignmentParamsSchema),
    async (c) => {
      const { slug, templateId } = c.req.valid("param");

      const [hub] = await db
        .select({ id: projectHubs.id })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      const [updated] = await db
        .update(projects)
        .set({
          projectHubId: null,
          templateCategory: null,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, templateId), eq(projects.projectHubId, hub.id)))
        .returning({
          id: projects.id,
          projectHubId: projects.projectHubId,
          templateCategory: projects.templateCategory,
        });

      if (!updated) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: updated });
    },
  )
  .get(
    "/:slug/leaderboards",
    requireAuth,
    zValidator("param", slugParamSchema),
    async (c) => {
      const { slug } = c.req.valid("param");

      const [hub] = await db
        .select({ id: projectHubs.id })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      const [topContributors, topTemplates] = await Promise.all([
        db
          .select({
            userId: users.id,
            name: users.name,
            image: users.image,
            remixCount: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
          })
          .from(templateUsageEvents)
          .innerJoin(projects, eq(templateUsageEvents.templateProjectId, projects.id))
          .innerJoin(users, eq(templateUsageEvents.userId, users.id))
          .where(
            and(
              eq(projects.projectHubId, hub.id),
              eq(templateUsageEvents.type, "remix"),
            ),
          )
          .groupBy(users.id)
          .orderBy(desc(sql<number>`count(${templateUsageEvents.id})`))
          .limit(25),
        db
          .select({
            templateId: projects.id,
            name: projects.name,
            thumbnailUrl: projects.thumbnailUrl,
            remixCount: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
          })
          .from(projects)
          .leftJoin(
            templateUsageEvents,
            and(
              eq(templateUsageEvents.templateProjectId, projects.id),
              eq(templateUsageEvents.type, "remix"),
            ),
          )
          .where(
            and(
              eq(projects.projectHubId, hub.id),
              eq(projects.isTemplate, true),
              eq(projects.isPublicTemplate, true),
            ),
          )
          .groupBy(projects.id)
          .orderBy(desc(sql<number>`count(${templateUsageEvents.id})`))
          .limit(25),
      ]);

      return c.json({
        data: {
          topContributors: topContributors.map((row) => ({
            ...row,
            remixCount: row.remixCount ?? 0,
          })),
          topTemplates: topTemplates.map((row) => ({
            ...row,
            remixCount: row.remixCount ?? 0,
          })),
        },
      });
    },
  )
  .get(
    "/:slug/activity",
    requireAuth,
    zValidator("param", slugParamSchema),
    async (c) => {
      const { slug } = c.req.valid("param");

      const [hub] = await db
        .select({ id: projectHubs.id })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      const events = await db
        .select({
          id: templateUsageEvents.id,
          createdAt: templateUsageEvents.createdAt,
          user: {
            id: users.id,
            name: users.name,
            image: users.image,
          },
          template: {
            id: projects.id,
            name: projects.name,
          },
        })
        .from(templateUsageEvents)
        .innerJoin(projects, eq(templateUsageEvents.templateProjectId, projects.id))
        .innerJoin(users, eq(templateUsageEvents.userId, users.id))
        .where(
          and(
            eq(projects.projectHubId, hub.id),
            eq(templateUsageEvents.type, "remix"),
          ),
        )
        .orderBy(desc(templateUsageEvents.createdAt))
        .limit(20);

      return c.json({
        data: events,
      });
    },
  )
  .get(
    "/:slug/rewards/airdrop.csv",
    requireAuth,
    zValidator("param", slugParamSchema),
    async (c) => {
      const { slug } = c.req.valid("param");

      const [hub] = await db
        .select({ id: projectHubs.id, name: projectHubs.name })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      const topContributors = await db
        .select({
          userId: users.id,
          name: users.name,
          embeddedWalletAddress: users.embeddedWalletAddress,
          externalWalletAddress: users.externalWalletAddress,
          twitterUsername: users.twitterUsername,
          discordUsername: users.discordUsername,
          telegramUsername: users.telegramUsername,
          remixCount: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
        })
        .from(templateUsageEvents)
        .innerJoin(projects, eq(templateUsageEvents.templateProjectId, projects.id))
        .innerJoin(users, eq(templateUsageEvents.userId, users.id))
        .where(
          and(
            eq(projects.projectHubId, hub.id),
            eq(templateUsageEvents.type, "remix"),
          ),
        )
        .groupBy(users.id)
        .orderBy(desc(sql<number>`count(${templateUsageEvents.id})`))
        .limit(500);

      const header = [
        "userId",
        "name",
        "embeddedWalletAddress",
        "externalWalletAddress",
        "twitterUsername",
        "discordUsername",
        "telegramUsername",
        "remixCount",
      ];
      const lines = [
        header.join(","),
        ...topContributors.map((row) =>
          [
            row.userId,
            row.name ?? "",
            row.embeddedWalletAddress ?? "",
            row.externalWalletAddress ?? "",
            row.twitterUsername ?? "",
            row.discordUsername ?? "",
            row.telegramUsername ?? "",
            String(row.remixCount ?? 0),
          ]
            .map((value) => JSON.stringify(value))
            .join(","),
        ),
      ];

      return c.body(lines.join("\n"), 200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${hub.name.replaceAll("\"", "")}-airdrop.csv\"`,
      });
    },
  )
  .get(
    "/:slug/rewards",
    requireAuth,
    zValidator("param", slugParamSchema),
    async (c) => {
      const { slug } = c.req.valid("param");

      const [hub] = await db
        .select({ id: projectHubs.id })
        .from(projectHubs)
        .where(eq(projectHubs.slug, slug))
        .limit(1);

      if (!hub) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({
        data: {
          comingSoon: true,
        },
      });
    },
  );

export default app;
