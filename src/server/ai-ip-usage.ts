import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { aiIpDailyUsage, aiIpWorkflowUsage } from "@/db/schema";

export type AiIpAction = "image" | "separate-layers";

type AiIpUsageRow = typeof aiIpDailyUsage.$inferSelect;

const getUtcDateKey = (now = new Date()) => now.toISOString().slice(0, 10);

const parseLimit = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(0, Math.floor(num));
};

const getDailyLimit = (action: AiIpAction) => {
  return parseLimit(
    action === "image"
      ? process.env.AI_IP_DAILY_LIMIT_IMAGE
      : process.env.AI_IP_DAILY_LIMIT_SEPARATE_LAYERS,
    5,
  );
};

const isUnlimited = (limit: number) => limit === 0;

const ensureUsageRow = async (ip: string, date: string) => {
  await db
    .insert(aiIpDailyUsage)
    .values({ ip, date })
    .onConflictDoNothing({
      target: [aiIpDailyUsage.ip, aiIpDailyUsage.date],
    });

  const rows = await db
    .select()
    .from(aiIpDailyUsage)
    .where(and(eq(aiIpDailyUsage.ip, ip), eq(aiIpDailyUsage.date, date)));

  return rows[0] ?? null;
};

const getUsageCount = (row: AiIpUsageRow, action: AiIpAction) =>
  action === "image" ? row.imageCount : row.separateLayersCount;

const hasWorkflowUsage = async (workflowId: string) => {
  const rows = await db
    .select({
      workflowId: aiIpWorkflowUsage.workflowId,
    })
    .from(aiIpWorkflowUsage)
    .where(eq(aiIpWorkflowUsage.workflowId, workflowId))
    .limit(1);
  return rows.length > 0;
};

export type AiIpUsageDecision = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  date: string;
  usageRow: AiIpUsageRow | null;
  shouldIncrement: boolean;
};

export const checkAiIpUsage = async (params: {
  ip: string | null;
  action: AiIpAction;
  workflowId?: string | null;
}): Promise<AiIpUsageDecision> => {
  const { ip, action, workflowId } = params;
  const date = getUtcDateKey();

  if (!ip) {
    return {
      allowed: true,
      limit: 0,
      used: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      date,
      usageRow: null,
      shouldIncrement: false,
    };
  }

  const limit = getDailyLimit(action);
  const row = await ensureUsageRow(ip, date);

  if (!row) {
    return {
      allowed: false,
      limit,
      used: 0,
      remaining: 0,
      date,
      usageRow: null,
      shouldIncrement: false,
    };
  }

  let shouldIncrement = true;
  if (action === "separate-layers" && workflowId) {
    const alreadyUsed = await hasWorkflowUsage(workflowId);
    if (alreadyUsed) {
      shouldIncrement = false;
    }
  }

  const used = getUsageCount(row, action);

  if (isUnlimited(limit)) {
    return {
      allowed: true,
      limit,
      used,
      remaining: Number.MAX_SAFE_INTEGER,
      date,
      usageRow: row,
      shouldIncrement,
    };
  }

  const remaining = Math.max(0, limit - used);
  const allowed = shouldIncrement ? remaining > 0 : true;

  return {
    allowed,
    limit,
    used,
    remaining,
    date,
    usageRow: row,
    shouldIncrement,
  };
};

export const incrementAiIpUsage = async (params: {
  decision: AiIpUsageDecision;
  action: AiIpAction;
  ip: string | null;
  workflowId?: string | null;
}) => {
  const { decision, action, ip, workflowId } = params;
  if (!decision.usageRow || !decision.shouldIncrement) return;
  if (!ip) return;

  if (action === "separate-layers" && workflowId) {
    const inserted = await db
      .insert(aiIpWorkflowUsage)
      .values({
        workflowId,
        ip,
        date: decision.date,
        action,
      })
      .onConflictDoNothing()
      .returning({
        workflowId: aiIpWorkflowUsage.workflowId,
      });

    if (!inserted.length) {
      return;
    }
  }

  await db
    .update(aiIpDailyUsage)
    .set({
      ...(action === "image"
        ? { imageCount: sql`${aiIpDailyUsage.imageCount} + 1` }
        : { separateLayersCount: sql`${aiIpDailyUsage.separateLayersCount} + 1` }),
      updatedAt: new Date(),
    })
    .where(eq(aiIpDailyUsage.id, decision.usageRow.id));
};

export const getAiIpLimitErrorBody = (decision: AiIpUsageDecision) => ({
  error: "Daily IP limit reached",
  limit: decision.limit,
  used: decision.used,
  remaining: decision.remaining,
  date: decision.date,
});
