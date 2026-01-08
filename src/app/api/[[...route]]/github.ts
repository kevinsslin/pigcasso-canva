import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";

import { db } from "@/db/drizzle";
import { githubConnections } from "@/db/schema";
import { normalizeDbError } from "@/server/db-errors";
import { requireAuth } from "@/server/hono-auth";
import { decryptSecret, encryptSecret, getGithubOAuthEncryptionKey } from "@/server/crypto";
import { HttpError } from "@/server/http-error";
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

    let row: { githubUsername: string | null } | undefined;
    try {
      [row] = await db
        .select({
          githubUsername: githubConnections.githubUsername,
        })
        .from(githubConnections)
        .where(eq(githubConnections.userId, auth.id));
    } catch (error) {
      throw normalizeDbError(error, {
        fallbackMessage: "Failed to fetch GitHub connection.",
      });
    }

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
      let key: Buffer;
      try {
        key = getGithubOAuthEncryptionKey();
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : "Missing GitHub encryption key";
        throw new HttpError(500, `Server misconfigured: ${message}`);
      }

      const now = new Date();
      try {
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
      } catch (error) {
        throw normalizeDbError(error, {
          fallbackMessage: "Failed to save GitHub connection.",
        });
      }

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
    try {
      await db.delete(githubConnections).where(eq(githubConnections.userId, auth.id));
    } catch (error) {
      throw normalizeDbError(error, {
        fallbackMessage: "Failed to disconnect GitHub.",
      });
    }
    return c.json({ data: { connected: false } });
  })
  .get("/repos", requireAuth, async (c) => {
    const auth = c.get("authUser");

    let connection: { accessTokenEncrypted: string } | undefined;
    try {
      [connection] = await db
        .select({
          accessTokenEncrypted: githubConnections.accessTokenEncrypted,
        })
        .from(githubConnections)
        .where(eq(githubConnections.userId, auth.id));
    } catch (error) {
      throw normalizeDbError(error, {
        fallbackMessage: "Failed to fetch GitHub connection.",
      });
    }

    if (!connection) {
      return c.json({ error: "GitHub not connected" }, 404);
    }

    let key: Buffer;
    try {
      key = getGithubOAuthEncryptionKey();
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "Missing GitHub encryption key";
      throw new HttpError(500, `Server misconfigured: ${message}`);
    }

    let token: string;
    try {
      token = decryptSecret(connection.accessTokenEncrypted, key);
    } catch {
      throw new HttpError(400, "GitHub token could not be decrypted. Please reconnect GitHub.");
    }

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

      let connection: { accessTokenEncrypted: string } | undefined;
      try {
        [connection] = await db
          .select({
            accessTokenEncrypted: githubConnections.accessTokenEncrypted,
          })
          .from(githubConnections)
          .where(eq(githubConnections.userId, auth.id));
      } catch (error) {
        throw normalizeDbError(error, {
          fallbackMessage: "Failed to fetch GitHub connection.",
        });
      }

      if (!connection) {
        return c.json({ error: "GitHub not connected" }, 404);
      }

      let key: Buffer;
      try {
        key = getGithubOAuthEncryptionKey();
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : "Missing GitHub encryption key";
        throw new HttpError(500, `Server misconfigured: ${message}`);
      }

      let token: string;
      try {
        token = decryptSecret(connection.accessTokenEncrypted, key);
      } catch {
        throw new HttpError(400, "GitHub token could not be decrypted. Please reconnect GitHub.");
      }

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
