import { Hono } from "hono";

import { requireAuth } from "@/server/hono-auth";
import { getAiLimitsForUser, getAiUsageRowForToday } from "@/server/ai-usage";
import { getProStatusForUser } from "@/server/token-gating";

const app = new Hono().get("/", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const pro = await getProStatusForUser({
    userId: authUser.id,
    embeddedWalletAddress: authUser.embeddedWalletAddress,
    externalWalletAddress: authUser.externalWalletAddress,
  });

  const usage = await getAiUsageRowForToday(authUser.id);
  const limits = getAiLimitsForUser(pro.isPro);

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
      ai: {
        providers: {
          replicate: true,
          gemini: Boolean(process.env.GEMINI_API_KEY),
        },
        defaultProvider:
          process.env.AI_PROVIDER_DEFAULT === "gemini" ? "gemini" : "replicate",
        limits,
        usage: usage
          ? {
              date: usage.date,
              generateCount: usage.generateCount,
              removeBgCount: usage.removeBgCount,
            }
          : null,
      },
    },
  });
});

export default app;
