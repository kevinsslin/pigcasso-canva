import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { projectHubs, projects, templateUsageEvents, users } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(25),
});

const app = new Hono().get("/", requireAuth, zValidator("query", querySchema), async (c) => {
  const { limit } = c.req.valid("query");

  const [topProjects, topCreators, topTemplates] = await Promise.all([
    db
      .select({
        id: projectHubs.id,
        slug: projectHubs.slug,
        name: projectHubs.name,
        logoUrl: projectHubs.logoUrl,
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
      .groupBy(projectHubs.id)
      .orderBy(desc(sql<number>`count(${templateUsageEvents.id})`))
      .limit(limit),
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
          eq(templateUsageEvents.type, "remix"),
          eq(projects.isTemplate, true),
          eq(projects.isPublicTemplate, true),
          isNotNull(projects.projectHubId),
        ),
      )
      .groupBy(users.id)
      .orderBy(desc(sql<number>`count(${templateUsageEvents.id})`))
      .limit(limit),
    db
      .select({
        templateId: projects.id,
        name: projects.name,
        thumbnailUrl: projects.thumbnailUrl,
        remixCount: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
        projectHubId: projects.projectHubId,
        projectHubSlug: projectHubs.slug,
        projectHubName: projectHubs.name,
      })
      .from(projects)
      .innerJoin(projectHubs, eq(projects.projectHubId, projectHubs.id))
      .leftJoin(
        templateUsageEvents,
        and(
          eq(templateUsageEvents.templateProjectId, projects.id),
          eq(templateUsageEvents.type, "remix"),
        ),
      )
      .where(
        and(
          eq(projects.isTemplate, true),
          eq(projects.isPublicTemplate, true),
          isNotNull(projects.projectHubId),
        ),
      )
      .groupBy(projects.id, projectHubs.id)
      .orderBy(desc(sql<number>`count(${templateUsageEvents.id})`))
      .limit(limit),
  ]);

  return c.json({
    data: {
      topProjects: topProjects.map((row) => ({
        ...row,
        templatesCount: row.templatesCount ?? 0,
        remixCount: row.remixCount ?? 0,
      })),
      topCreators: topCreators.map((row) => ({
        ...row,
        remixCount: row.remixCount ?? 0,
      })),
      topTemplates: topTemplates.map((row) => ({
        ...row,
        remixCount: row.remixCount ?? 0,
      })),
    },
  });
});

export default app;
