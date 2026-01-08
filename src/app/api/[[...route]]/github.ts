import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { githubConnections } from "@/db/schema";
import { requireAuth } from "@/server/hono-auth";
import { decryptSecret, encryptSecret, getGithubOAuthEncryptionKey } from "@/server/crypto";
import {
  getGithubRepoDetails,
  getGithubRepoLanguages,
  getGithubRepoReadme,
  getGithubViewer,
  listGithubRepos,
} from "@/server/github";
import { buildRepositoryMemePrompt } from "@/server/repository-to-asset";
import { generateImage } from "@/server/ai-providers";
import { checkAiUsage, incrementAiUsage } from "@/server/ai-usage";
import { getProStatusForUser } from "@/server/token-gating";

const app = new Hono()
  .get("/connection", requireAuth, async (c) => {
    const auth = c.get("authUser");

    const [row] = await db
      .select({
        githubUsername: githubConnections.githubUsername,
      })
      .from(githubConnections)
      .where(eq(githubConnections.userId, auth.id));

    return c.json({
      data: {
        connected: Boolean(row),
        username: row?.githubUsername ?? null,
      },
    });
  })
  .post(
    "/connect",
    requireAuth,
    zValidator(
      "json",
      z.object({
        accessToken: z.string().min(1),
        refreshToken: z.string().min(1).optional(),
        scopes: z.array(z.string()).optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const body = c.req.valid("json");

      const viewer = await getGithubViewer(body.accessToken);
      const key = getGithubOAuthEncryptionKey();

      const now = new Date();
      await db
        .insert(githubConnections)
        .values({
          userId: auth.id,
          githubUserId: viewer.id,
          githubUsername: viewer.login,
          accessTokenEncrypted: encryptSecret(body.accessToken, key),
          refreshTokenEncrypted: body.refreshToken
            ? encryptSecret(body.refreshToken, key)
            : null,
          scopes: body.scopes?.length ? JSON.stringify(body.scopes) : null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [githubConnections.userId],
          set: {
            githubUserId: viewer.id,
            githubUsername: viewer.login,
            accessTokenEncrypted: encryptSecret(body.accessToken, key),
            refreshTokenEncrypted: body.refreshToken
              ? encryptSecret(body.refreshToken, key)
              : null,
            scopes: body.scopes?.length ? JSON.stringify(body.scopes) : null,
            updatedAt: now,
          },
        });

      return c.json({
        data: {
          connected: true,
          username: viewer.login,
        },
      });
    },
  )
  .post("/disconnect", requireAuth, async (c) => {
    const auth = c.get("authUser");
    await db.delete(githubConnections).where(eq(githubConnections.userId, auth.id));
    return c.json({ data: { connected: false } });
  })
  .get("/repos", requireAuth, async (c) => {
    const auth = c.get("authUser");

    const [connection] = await db
      .select({
        accessTokenEncrypted: githubConnections.accessTokenEncrypted,
      })
      .from(githubConnections)
      .where(eq(githubConnections.userId, auth.id));

    if (!connection) {
      return c.json({ error: "GitHub not connected" }, 404);
    }

    const token = decryptSecret(
      connection.accessTokenEncrypted,
      getGithubOAuthEncryptionKey(),
    );

    const repos = await listGithubRepos(token);

    return c.json({ data: repos });
  })
  .post(
    "/repos/:owner/:repo/generate-asset",
    requireAuth,
    zValidator(
      "param",
      z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { owner, repo } = c.req.valid("param");

      const [connection] = await db
        .select({
          accessTokenEncrypted: githubConnections.accessTokenEncrypted,
        })
        .from(githubConnections)
        .where(eq(githubConnections.userId, auth.id));

      if (!connection) {
        return c.json({ error: "GitHub not connected" }, 404);
      }

      const token = decryptSecret(
        connection.accessTokenEncrypted,
        getGithubOAuthEncryptionKey(),
      );

      const [repoDetails, languages, readme] = await Promise.all([
        getGithubRepoDetails(token, { owner, repo }),
        getGithubRepoLanguages(token, { owner, repo }),
        getGithubRepoReadme(token, { owner, repo }),
      ]);

      const prompt = buildRepositoryMemePrompt({
        repo: repoDetails,
        languages,
        readme,
      });

      const proStatus = await getProStatusForUser({
        userId: auth.id,
        embeddedWalletAddress: auth.embeddedWalletAddress,
        externalWalletAddress: auth.externalWalletAddress,
      });

      const decision = await checkAiUsage({
        userId: auth.id,
        isPro: proStatus.isPro,
        action: "generate",
      });

      if (!decision.allowed || !decision.usageRow) {
        return c.json(
          {
            error: "Daily limit reached",
            limit: decision.limit,
            used: decision.used,
            remaining: decision.remaining,
            date: decision.date,
          },
          429,
        );
      }

      const result = await generateImage({ prompt });
      await incrementAiUsage({ usageRow: decision.usageRow, action: "generate" });

      return c.json({
        data: {
          imageUrl: result.imageUrl,
        },
      });
    },
  );

export default app;

