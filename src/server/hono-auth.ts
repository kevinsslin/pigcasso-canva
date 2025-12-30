import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
  type AuthUser,
  getBearerToken,
  getOrCreateUserFromPrivyToken,
} from "@/server/auth";
import { getErrorStatus } from "@/server/http-error";
import { getProStatusForUser, type ProStatus } from "@/server/token-gating";

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
    proStatus?: ProStatus;
  }
}

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getBearerToken(c.req.header("Authorization"));

  if (!token) {
    return c.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Unauthorized"
            : "Missing Authorization bearer token",
      },
      401,
    );
  }

  try {
    const authUser = await getOrCreateUserFromPrivyToken(token);
    c.set("authUser", authUser);
    return await next();
  } catch (error) {
    const status = (getErrorStatus(error) ?? 500) as ContentfulStatusCode;
    const message =
      error instanceof Error && error.message ? error.message : "Internal Server Error";

    if (status === 401 || status === 403) {
      return c.json(
        { error: process.env.NODE_ENV === "production" ? "Unauthorized" : message },
        401,
      );
    }

    console.error(error);

    return c.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Server misconfigured"
            : message,
      },
      status,
    );
  }
});

export const requirePro = createMiddleware(async (c, next) => {
  const token = getBearerToken(c.req.header("Authorization"));

  if (!token) {
    return c.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Unauthorized"
            : "Missing Authorization bearer token",
      },
      401,
    );
  }

  try {
    const authUser = await getOrCreateUserFromPrivyToken(token);
    c.set("authUser", authUser);

    const proStatus = await getProStatusForUser({
      userId: authUser.id,
      embeddedWalletAddress: authUser.embeddedWalletAddress,
      externalWalletAddress: authUser.externalWalletAddress,
    });

    c.set("proStatus", proStatus);

    if (!proStatus.isPro) {
      return c.json({ error: "Pro required" }, 403);
    }

    return await next();
  } catch (error) {
    const status = (getErrorStatus(error) ?? 500) as ContentfulStatusCode;
    const message =
      error instanceof Error && error.message ? error.message : "Internal Server Error";

    if (status === 401 || status === 403) {
      return c.json(
        { error: process.env.NODE_ENV === "production" ? "Unauthorized" : message },
        401,
      );
    }

    console.error(error);
    return c.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Server misconfigured"
            : message,
      },
      status,
    );
  }
});
