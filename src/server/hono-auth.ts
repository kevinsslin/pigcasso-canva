import { createMiddleware } from "hono/factory";

import {
  type AuthUser,
  getBearerToken,
  getOrCreateUserFromPrivyToken,
} from "@/server/auth";
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
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const authUser = await getOrCreateUserFromPrivyToken(token);
    c.set("authUser", authUser);
    return await next();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing ")) {
      return c.json(
        { error: process.env.NODE_ENV === "production" ? "Server misconfigured" : error.message },
        500,
      );
    }

    console.error(error);
    return c.json({ error: "Unauthorized" }, 401);
  }
});

export const requirePro = createMiddleware(async (c, next) => {
  const token = getBearerToken(c.req.header("Authorization"));

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
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
    if (error instanceof Error && error.message.startsWith("Missing ")) {
      return c.json(
        { error: process.env.NODE_ENV === "production" ? "Server misconfigured" : error.message },
        500,
      );
    }

    console.error(error);
    return c.json({ error: "Unauthorized" }, 401);
  }
});
