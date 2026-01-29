import { getAiAccessDecision, getAiLimitErrorBody } from "@/server/ai/access";
import { checkAiIpUsage, getAiIpLimitErrorBody, type AiIpAction } from "@/server/ai-ip-usage";
import type { AuthUser } from "@/server/auth";

type AiAccessDecisionResult = Awaited<ReturnType<typeof getAiAccessDecision>>;
type AiAccessUsageRow = NonNullable<AiAccessDecisionResult["decision"]["usageRow"]>;
type AiAccessResult =
  | { ok: true; decision: AiAccessDecisionResult["decision"]; proStatus: AiAccessDecisionResult["proStatus"]; usageRow: AiAccessUsageRow }
  | { ok: false; error: ReturnType<typeof getAiLimitErrorBody> };

type AiIpDecisionResult = Awaited<ReturnType<typeof checkAiIpUsage>>;
type AiIpResult =
  | { ok: true; decision: AiIpDecisionResult }
  | { ok: false; error: ReturnType<typeof getAiIpLimitErrorBody> };

export const requireAiAccess = async (params: { authUser: AuthUser; action: "generate" | "remove-bg" }): Promise<AiAccessResult> => {
  const { authUser, action } = params;
  const { proStatus, decision } = await getAiAccessDecision({ authUser, action });

  if (!decision.allowed || !decision.usageRow) {
    return { ok: false, error: getAiLimitErrorBody(decision) };
  }

  return { ok: true, decision, proStatus, usageRow: decision.usageRow };
};

export const requireAiIpUsage = async (params: {
  ip: string | null;
  action: AiIpAction;
  workflowId?: string | null;
}): Promise<AiIpResult> => {
  const { ip, action, workflowId } = params;
  const decision = await checkAiIpUsage({ ip, action, workflowId });

  if (!decision.allowed) {
    return { ok: false, error: getAiIpLimitErrorBody(decision) };
  }

  return { ok: true, decision };
};
