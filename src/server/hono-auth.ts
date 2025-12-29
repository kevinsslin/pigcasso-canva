import { createMiddleware } from "hono/factory";

import {
  type AuthUser,
  getBearerToken,
  getOrCreateUserFromPrivyToken,
} from "@/server/auth";

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
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
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});

