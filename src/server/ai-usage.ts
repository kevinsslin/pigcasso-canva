import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { aiDailyUsage } from "@/db/schema";

export type AiAction = "generate" | "remove-bg";

type AiUsageRow = typeof aiDailyUsage.$inferSelect;

const getUtcDateKey = (now = new Date()) => now.toISOString().slice(0, 10);

const parseLimit = (value: string | undefined, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.max(0, Math.floor(num));
};

const getDailyLimit = (action: AiAction, isPro: boolean) => {
  if (isPro) {
    return parseLimit(
      action === "generate"
        ? process.env.AI_DAILY_LIMIT_PRO_GENERATE
        : process.env.AI_DAILY_LIMIT_PRO_REMOVE_BG,
      0,
    );
  }

  return parseLimit(
    action === "generate"
      ? process.env.AI_DAILY_LIMIT_FREE_GENERATE
      : process.env.AI_DAILY_LIMIT_FREE_REMOVE_BG,
    5,
  );
};

const isUnlimited = (limit: number) => limit === 0;

const ensureUsageRow = async (userId: string, date: string) => {
  await db
    .insert(aiDailyUsage)
    .values({ userId, date })
    .onConflictDoNothing({
      target: [aiDailyUsage.userId, aiDailyUsage.date],
    });

  const rows = await db
    .select()
    .from(aiDailyUsage)
    .where(and(eq(aiDailyUsage.userId, userId), eq(aiDailyUsage.date, date)));

  return rows[0] ?? null;
};

export type AiUsageDecision = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  date: string;
  usageRow: AiUsageRow | null;
};

export const checkAiUsage = async (params: {
  userId: string;
  isPro: boolean;
  action: AiAction;
}): Promise<AiUsageDecision> => {
  const { userId, isPro, action } = params;
  const date = getUtcDateKey();

  const limit = getDailyLimit(action, isPro);
  const row = await ensureUsageRow(userId, date);

  if (!row) {
    return {
      allowed: false,
      limit,
      used: 0,
      remaining: 0,
      date,
      usageRow: null,
    };
  }

  const used = action === "generate" ? row.generateCount : row.removeBgCount;

  if (isUnlimited(limit)) {
    return {
      allowed: true,
      limit,
      used,
      remaining: Number.MAX_SAFE_INTEGER,
      date,
      usageRow: row,
    };
  }

  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    limit,
    used,
    remaining,
    date,
    usageRow: row,
  };
};

export const incrementAiUsage = async (params: {
  usageRow: AiUsageRow;
  action: AiAction;
}) => {
  const { usageRow, action } = params;

  const now = new Date();

  await db
    .update(aiDailyUsage)
    .set({
      ...(action === "generate"
        ? { generateCount: sql`${aiDailyUsage.generateCount} + 1` }
        : { removeBgCount: sql`${aiDailyUsage.removeBgCount} + 1` }),
      updatedAt: now,
    })
    .where(eq(aiDailyUsage.id, usageRow.id));
};

export const getAiUsageRowForToday = async (userId: string) => {
  const date = getUtcDateKey();
  return ensureUsageRow(userId, date);
};

export const getAiLimitsForUser = (isPro: boolean) => {
  return {
    generate: getDailyLimit("generate", isPro),
    removeBg: getDailyLimit("remove-bg", isPro),
  };
};
