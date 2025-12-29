import { Hono } from "hono";

import { requireAuth } from "@/server/hono-auth";
import { getProStatusForUser } from "@/server/token-gating";

const app = new Hono().post("/refresh", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const pro = await getProStatusForUser({
    userId: authUser.id,
    embeddedWalletAddress: authUser.embeddedWalletAddress,
    externalWalletAddress: authUser.externalWalletAddress,
    forceRefresh: true,
  });

  return c.json({ data: pro });
});

export default app;

