import { Hono } from "hono";

import { requireAuth } from "@/server/hono-auth";
import { getProStatusForUser } from "@/server/token-gating";

const app = new Hono().get("/", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const pro = await getProStatusForUser({
    userId: authUser.id,
    embeddedWalletAddress: authUser.embeddedWalletAddress,
    externalWalletAddress: authUser.externalWalletAddress,
  });

  return c.json({
    data: {
      user: {
        id: authUser.id,
        privyUserId: authUser.privyUserId,
        email: authUser.email,
        wallets: {
          embedded: authUser.embeddedWalletAddress,
          external: authUser.externalWalletAddress,
        },
      },
      pro,
    },
  });
});

export default app;

