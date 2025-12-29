import type { User } from "@privy-io/server-auth";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { privy } from "@/server/privy";

export type AuthUser = {
  id: string;
  privyUserId: string;
  email: string | null;
  embeddedWalletAddress: string | null;
  externalWalletAddress: string | null;
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

  const externalWallet = wallets
    .filter((wallet) => wallet.walletClientType !== "privy")
    .sort((a, b) => {
      const aTs = a.latestVerifiedAt?.getTime() ?? a.firstVerifiedAt?.getTime() ?? 0;
      const bTs = b.latestVerifiedAt?.getTime() ?? b.firstVerifiedAt?.getTime() ?? 0;
      return bTs - aTs;
    })[0];

  return {
    embeddedWalletAddress: embeddedWallet?.address ?? null,
    externalWalletAddress: externalWallet?.address ?? null,
  };
};

export const getOrCreateUserFromPrivyToken = async (
  token: string,
): Promise<AuthUser> => {
  const claims = await privy.verifyAuthToken(token);
  const privyUser = await privy.getUser(claims.userId);

  const { embeddedWalletAddress, externalWalletAddress } = getWalletAddresses(privyUser);
  const email = privyUser.email?.address ?? null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUser.id));

  const existingUser = existing[0];

  if (!existingUser) {
    const inserted = await db
      .insert(users)
      .values({
        privyUserId: privyUser.id,
        email,
        embeddedWalletAddress,
        externalWalletAddress,
      })
      .returning();

    if (!inserted[0]) {
      throw new Error("Failed to create user");
    }

    return {
      id: inserted[0].id,
      privyUserId: inserted[0].privyUserId,
      email: inserted[0].email ?? null,
      embeddedWalletAddress: inserted[0].embeddedWalletAddress ?? null,
      externalWalletAddress: inserted[0].externalWalletAddress ?? null,
    };
  }

  const shouldUpdate =
    (email && existingUser.email !== email) ||
    existingUser.embeddedWalletAddress !== embeddedWalletAddress ||
    existingUser.externalWalletAddress !== externalWalletAddress;

  if (shouldUpdate) {
    await db
      .update(users)
      .set({
        ...(email ? { email } : {}),
        embeddedWalletAddress,
        externalWalletAddress,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));
  }

  return {
    id: existingUser.id,
    privyUserId: existingUser.privyUserId,
    email: existingUser.email ?? email ?? null,
    embeddedWalletAddress: embeddedWalletAddress ?? existingUser.embeddedWalletAddress ?? null,
    externalWalletAddress: externalWalletAddress ?? existingUser.externalWalletAddress ?? null,
  };
};

