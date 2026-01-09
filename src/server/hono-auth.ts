import { createMiddleware } from "hono/factory";

import {
  type AuthUser,
  getBearerToken,
  getOrCreateUserFromPrivyToken,
} from "@/server/auth";
import { HttpError } from "@/server/http-error";
import { getProStatusForUser, type ProStatus } from "@/server/token-gating";

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
    proStatus?: ProStatus;
  }
}

const getUnauthorizedMessage = () =>
  process.env.NODE_ENV === "production"
    ? "Unauthorized"
    : "Missing Authorization bearer token";

const getRequiredAuthToken = (authorizationHeader: string | undefined) => {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new HttpError(401, getUnauthorizedMessage());
  }
  return token;
};

export const requireAuth = createMiddleware(async (c, next) => {
  const token = getRequiredAuthToken(c.req.header("Authorization"));
  const authUser = await getOrCreateUserFromPrivyToken(token);
  c.set("authUser", authUser);
  return await next();
});

export const requirePro = createMiddleware(async (c, next) => {
  const token = getRequiredAuthToken(c.req.header("Authorization"));
  const authUser = await getOrCreateUserFromPrivyToken(token);
  c.set("authUser", authUser);

  const proStatus = await getProStatusForUser({
    userId: authUser.id,
    embeddedWalletAddress: authUser.embeddedWalletAddress,
    externalWalletAddresses: authUser.externalWalletAddresses,
    externalWalletAddress: authUser.externalWalletAddress,
  });

  c.set("proStatus", proStatus);

  if (!proStatus.isPro) {
    throw new HttpError(403, "Pro required");
  }

  return await next();
});
