import { cache } from "react";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { nftAssets, projects, templateTokens, templateUsageEvents, users } from "@/db/schema";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WALLET_REGEX = /^0x[a-f0-9]{40}$/i;

export const normalizeSpaceHandle = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const withoutPrefix = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  return withoutPrefix.trim();
};

export const isUuid = (value: string) => UUID_REGEX.test(value);

export const isWalletAddress = (value: string) => WALLET_REGEX.test(value);

export const getCanonicalSpaceHandle = (user: {
  id: string;
  twitterUsername: string | null;
  discordUsername: string | null;
  telegramUsername: string | null;
}) => user.twitterUsername || user.discordUsername || user.telegramUsername || user.id;

const selectPublicSpaceUser = {
  id: users.id,
  name: users.name,
  image: users.image,
  bio: users.bio,
  twitterUsername: users.twitterUsername,
  discordUsername: users.discordUsername,
  telegramUsername: users.telegramUsername,
  embeddedWalletAddress: users.embeddedWalletAddress,
  externalWalletAddress: users.externalWalletAddress,
};

export type PublicSpaceUserRow = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  twitterUsername: string | null;
  discordUsername: string | null;
  telegramUsername: string | null;
  embeddedWalletAddress: string | null;
  externalWalletAddress: string | null;
};

export const getSpaceUserByHandle = async (input: string) => {
  const normalized = normalizeSpaceHandle(input);
  if (!normalized) return null;

  if (isUuid(normalized)) {
    const [user] = await db.select(selectPublicSpaceUser).from(users).where(eq(users.id, normalized));
    return (user ?? null) as PublicSpaceUserRow | null;
  }

  const lower = normalized.toLowerCase();

  if (isWalletAddress(normalized)) {
    const [user] = await db
      .select(selectPublicSpaceUser)
      .from(users)
      .where(
        sql`lower(${users.embeddedWalletAddress}) = ${lower} OR lower(${users.externalWalletAddress}) = ${lower}`,
      );
    return (user ?? null) as PublicSpaceUserRow | null;
  }

  const [twitterMatch] = await db
    .select(selectPublicSpaceUser)
    .from(users)
    .where(sql`lower(${users.twitterUsername}) = ${lower}`);
  if (twitterMatch) return twitterMatch as PublicSpaceUserRow;

  const [discordMatch] = await db
    .select(selectPublicSpaceUser)
    .from(users)
    .where(sql`lower(${users.discordUsername}) = ${lower}`);
  if (discordMatch) return discordMatch as PublicSpaceUserRow;

  const [telegramMatch] = await db
    .select(selectPublicSpaceUser)
    .from(users)
    .where(sql`lower(${users.telegramUsername}) = ${lower}`);
  if (telegramMatch) return telegramMatch as PublicSpaceUserRow;

  return null;
};

export type PublicSpaceData = {
  handle: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    socials: {
      twitter: { username: string } | null;
      discord: { username: string } | null;
      telegram: { username: string } | null;
    };
    wallets: {
      primary: string | null;
    };
  };
  stats: {
    projects: number;
    templates: {
      total: number;
      public: number;
      remixesReceived: number;
      remixesMade: number;
      tokens: number;
    };
    nfts: {
      minted: number;
    };
  };
  highlights: {
    templates: Array<{
      id: string;
      name: string;
      width: number;
      height: number;
      thumbnailUrl: string | null;
      isPro: boolean;
      remixCount: number;
      token: { printrTokenId: string | null; status: string | null };
    }>;
  };
};

export const getPublicSpaceData = async (input: string): Promise<PublicSpaceData | null> => {
  const user = await getSpaceUserByHandle(input);
  if (!user) return null;

  const canonicalHandle = getCanonicalSpaceHandle(user);

  const [
    [projectCountRow],
    [templateCountRow],
    [publicTemplateCountRow],
    [tokensCountRow],
    [remixesMadeRow],
    [mintedNftRow],
    remixesReceivedRows,
    templatesRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(projects)
      .where(eq(projects.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(projects)
      .where(and(eq(projects.userId, user.id), eq(projects.isTemplate, true))),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(projects)
      .where(
        and(
          eq(projects.userId, user.id),
          eq(projects.isTemplate, true),
          eq(projects.isPublicTemplate, true),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(templateTokens)
      .where(eq(templateTokens.creatorUserId, user.id)),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(templateUsageEvents)
      .where(and(eq(templateUsageEvents.userId, user.id), eq(templateUsageEvents.type, "remix"))),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(nftAssets)
      .where(and(eq(nftAssets.userId, user.id), eq(nftAssets.status, "minted"))),
    db
      .select({
        count: sql<number>`count(${templateUsageEvents.id})`.mapWith(Number),
      })
      .from(templateUsageEvents)
      .innerJoin(projects, eq(templateUsageEvents.templateProjectId, projects.id))
      .where(and(eq(projects.userId, user.id), eq(templateUsageEvents.type, "remix"))),
    db
      .select({
        id: projects.id,
        name: projects.name,
        width: projects.width,
        height: projects.height,
        thumbnailUrl: projects.thumbnailUrl,
        isPro: projects.isPro,
        token: {
          printrTokenId: templateTokens.printrTokenId,
          status: templateTokens.status,
        },
      })
      .from(projects)
      .leftJoin(templateTokens, eq(templateTokens.templateProjectId, projects.id))
      .where(
        and(
          eq(projects.userId, user.id),
          eq(projects.isTemplate, true),
          eq(projects.isPublicTemplate, true),
        ),
      )
      .orderBy(desc(projects.updatedAt), desc(projects.publishedAt))
      .limit(6),
  ]);

  const templateIds = templatesRows.map((row) => row.id);
  const remixCountsByTemplateId = new Map<string, number>();

  if (templateIds.length) {
    const remixCounts = await db
      .select({
        templateProjectId: templateUsageEvents.templateProjectId,
        remixCount: sql<number>`count(*)`.mapWith(Number),
      })
      .from(templateUsageEvents)
      .where(
        and(
          inArray(templateUsageEvents.templateProjectId, templateIds),
          eq(templateUsageEvents.type, "remix"),
        ),
      )
      .groupBy(templateUsageEvents.templateProjectId);

    remixCounts.forEach((row) => {
      remixCountsByTemplateId.set(row.templateProjectId, row.remixCount);
    });
  }

  const remixesReceived = remixesReceivedRows?.[0]?.count ?? 0;

  return {
    handle: canonicalHandle,
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
      bio: user.bio,
      socials: {
        twitter: user.twitterUsername ? { username: user.twitterUsername } : null,
        discord: user.discordUsername ? { username: user.discordUsername } : null,
        telegram: user.telegramUsername ? { username: user.telegramUsername } : null,
      },
      wallets: {
        primary: user.externalWalletAddress || user.embeddedWalletAddress || null,
      },
    },
    stats: {
      projects: projectCountRow?.count ?? 0,
      templates: {
        total: templateCountRow?.count ?? 0,
        public: publicTemplateCountRow?.count ?? 0,
        remixesReceived,
        remixesMade: remixesMadeRow?.count ?? 0,
        tokens: tokensCountRow?.count ?? 0,
      },
      nfts: {
        minted: mintedNftRow?.count ?? 0,
      },
    },
    highlights: {
      templates: templatesRows.map((row) => ({
        id: row.id,
        name: row.name,
        width: row.width,
        height: row.height,
        thumbnailUrl: row.thumbnailUrl,
        isPro: row.isPro,
        remixCount: remixCountsByTemplateId.get(row.id) ?? 0,
        token: {
          printrTokenId: row.token?.printrTokenId ?? null,
          status: row.token?.status ?? null,
        },
      })),
    },
  };
};

export const getPublicSpaceDataCached = cache(getPublicSpaceData);
