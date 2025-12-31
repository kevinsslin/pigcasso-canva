import type { User } from "@privy-io/server-auth";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { privy } from "@/server/privy";
import { HttpError, getErrorStatus } from "@/server/http-error";

export type AuthUser = {
  id: string;
  privyUserId: string;
  email: string | null;
  embeddedWalletAddress: string | null;
  externalWalletAddress: string | null;
  externalWalletAddresses: string[];
};

export const getBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return null;
  }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

const getWalletAddresses = (privyUser: User) => {
  const wallets = privyUser.linkedAccounts.filter(
    (account): account is Extract<(typeof privyUser.linkedAccounts)[number], { type: "wallet" }> =>
      account.type === "wallet" && account.chainType === "ethereum",
  );

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy",
  );

  const externalWallets = wallets
    .filter((wallet) => wallet.walletClientType !== "privy")
    .sort((a, b) => {
      const aTs = a.latestVerifiedAt?.getTime() ?? a.firstVerifiedAt?.getTime() ?? 0;
      const bTs = b.latestVerifiedAt?.getTime() ?? b.firstVerifiedAt?.getTime() ?? 0;
      return bTs - aTs;
    });

  return {
    embeddedWalletAddress: embeddedWallet?.address ?? null,
    externalWalletAddress: externalWallets[0]?.address ?? null,
    externalWalletAddresses: externalWallets.map((wallet) => wallet.address),
  };
};

export const getOrCreateUserFromPrivyToken = async (
  token: string,
): Promise<AuthUser> => {
  let claims: { userId: string };
  try {
    claims = await privy.verifyAuthToken(token);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing ")) {
      throw error;
    }
    throw new HttpError(401, "Unauthorized");
  }

  let privyUser: User;
  try {
    privyUser = await privy.getUser(claims.userId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing ")) {
      throw error;
    }

    const status = getErrorStatus(error);
    if (status === 401 || status === 403 || status === 404) {
      throw new HttpError(401, "Unauthorized");
    }

    throw new HttpError(502, "Privy request failed");
  }

  const { embeddedWalletAddress, externalWalletAddress, externalWalletAddresses } =
    getWalletAddresses(privyUser);
  const email = privyUser.email?.address ?? null;

  let existingUser: (typeof users.$inferSelect) | undefined;
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.privyUserId, privyUser.id));

    existingUser = existing[0];
  } catch (error) {
    throw new HttpError(
      500,
      error instanceof Error ? error.message : "Failed to load user",
    );
  }

  if (!existingUser) {
    let inserted: Array<typeof users.$inferSelect> = [];
    try {
      inserted = await db
        .insert(users)
        .values({
          privyUserId: privyUser.id,
          email,
          embeddedWalletAddress,
          externalWalletAddress,
        })
        .returning();
    } catch (error) {
      throw new HttpError(
        500,
        error instanceof Error ? error.message : "Failed to create user",
      );
    }

    if (!inserted[0]) {
      throw new HttpError(500, "Failed to create user");
    }

    return {
      id: inserted[0].id,
      privyUserId: inserted[0].privyUserId,
      email: inserted[0].email ?? null,
      embeddedWalletAddress: inserted[0].embeddedWalletAddress ?? null,
      externalWalletAddress: inserted[0].externalWalletAddress ?? null,
      externalWalletAddresses,
    };
  }

  const shouldUpdate =
    (email && existingUser.email !== email) ||
    existingUser.embeddedWalletAddress !== embeddedWalletAddress ||
    existingUser.externalWalletAddress !== externalWalletAddress;

  if (shouldUpdate) {
    try {
      await db
        .update(users)
        .set({
          ...(email ? { email } : {}),
          embeddedWalletAddress,
          externalWalletAddress,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));
    } catch (error) {
      throw new HttpError(
        500,
        error instanceof Error ? error.message : "Failed to update user",
      );
    }
  }

  return {
    id: existingUser.id,
    privyUserId: existingUser.privyUserId,
    email: existingUser.email ?? email ?? null,
    embeddedWalletAddress: embeddedWalletAddress ?? existingUser.embeddedWalletAddress ?? null,
    externalWalletAddress: externalWalletAddress ?? existingUser.externalWalletAddress ?? null,
    externalWalletAddresses,
  };
};
