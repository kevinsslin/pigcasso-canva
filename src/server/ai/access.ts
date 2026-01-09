import type { AuthUser } from "@/server/auth";
import { checkAiUsage, type AiAction, type AiUsageDecision } from "@/server/ai-usage";
import { getProStatusForUser } from "@/server/token-gating";

import type { NanoBananaProfile } from "./gemini";

export const getAiAccessDecision = async (params: { authUser: AuthUser; action: AiAction }) => {
  const { authUser, action } = params;

  const proStatus = await getProStatusForUser({
    userId: authUser.id,
    embeddedWalletAddress: authUser.embeddedWalletAddress,
    externalWalletAddresses: authUser.externalWalletAddresses,
    externalWalletAddress: authUser.externalWalletAddress,
  });

  const decision = await checkAiUsage({
    userId: authUser.id,
    isPro: proStatus.isPro,
    action,
  });

  return { proStatus, decision };
};

export const getAiLimitErrorBody = (decision: AiUsageDecision) => ({
  error: "Daily limit reached",
  limit: decision.limit,
  used: decision.used,
  remaining: decision.remaining,
  date: decision.date,
});

export const getEffectiveNanoBananaProfile = (
  requested: NanoBananaProfile | undefined,
  isPro: boolean,
): NanoBananaProfile => {
  if (requested === "nano-banana-pro" && !isPro) {
    return "nano-banana";
  }
  return requested ?? "nano-banana";
};

