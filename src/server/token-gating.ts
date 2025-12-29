import { eq } from "drizzle-orm";
import {
  createPublicClient,
  erc20Abi,
  getContract,
  http,
  isAddress,
} from "viem";
import { mantle } from "viem/chains";

import { db } from "@/db/drizzle";
import { users } from "@/db/schema";

type TokenGatingConfig = {
  pigcassoToken: any;
  thresholdRaw: bigint;
};

let cachedConfig: TokenGatingConfig | null = null;

const getConfig = (): TokenGatingConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const mantleRpcUrl = process.env.MANTLE_RPC_URL;
  const tokenAddress = process.env.PIGCASSO_TOKEN_ADDRESS as
    | `0x${string}`
    | undefined;
  const thresholdRaw = process.env.PIGCASSO_PRO_THRESHOLD_RAW;

  if (!mantleRpcUrl) {
    throw new Error("Missing MANTLE_RPC_URL");
  }
  if (!tokenAddress) {
    throw new Error("Missing PIGCASSO_TOKEN_ADDRESS");
  }
  if (!thresholdRaw) {
    throw new Error("Missing PIGCASSO_PRO_THRESHOLD_RAW");
  }

  const publicClient = createPublicClient({
    chain: mantle,
    transport: http(mantleRpcUrl),
  });

  const pigcassoToken = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient,
  });

  cachedConfig = {
    pigcassoToken,
    thresholdRaw: BigInt(thresholdRaw),
  };

  return cachedConfig;
};

const PRO_CACHE_TTL_SECONDS = Number(process.env.PRO_CACHE_TTL_SECONDS ?? "600");
const PRO_CACHE_TTL_MS = Number.isFinite(PRO_CACHE_TTL_SECONDS)
  ? Math.max(0, PRO_CACHE_TTL_SECONDS) * 1000
  : 10 * 60 * 1000;

type ProStatusSource = "cache" | "refresh" | "error";

export type ProStatus = {
  isPro: boolean;
  balanceRaw: string | null;
  walletAddress: string | null;
  checkedAt: Date | null;
  source: ProStatusSource;
  error?: string;
};

const uniqueAddresses = (addresses: Array<string | null | undefined>) => {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const address of addresses) {
    if (!address) {
      continue;
    }
    const normalized = address.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    if (!isAddress(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }

  return out as Array<`0x${string}`>;
};

const getMaxPigcassoBalance = async (addresses: Array<`0x${string}`>) => {
  if (addresses.length === 0) {
    return { maxBalance: BigInt(0), maxWalletAddress: null as string | null };
  }

  const { pigcassoToken } = getConfig();

  const balances = await Promise.all(
    addresses.map(async (address) => {
      const balance = await pigcassoToken.read.balanceOf([address]);
      return { address, balance };
    }),
  );

  const max = balances.reduce(
    (acc, cur) => (cur.balance > acc.balance ? cur : acc),
    balances[0],
  );

  return {
    maxBalance: max.balance,
    maxWalletAddress: max.address,
  };
};

const isCacheFresh = (checkedAt: Date | null) => {
  if (!checkedAt) {
    return false;
  }
  return Date.now() - checkedAt.getTime() < PRO_CACHE_TTL_MS;
};

export const getProStatusForUser = async (params: {
  userId: string;
  embeddedWalletAddress: string | null;
  externalWalletAddress: string | null;
  forceRefresh?: boolean;
}): Promise<ProStatus> => {
  const { userId, embeddedWalletAddress, externalWalletAddress, forceRefresh } = params;

  const [row] = await db
    .select({
      isPro: users.isPro,
      proBalanceRaw: users.proBalanceRaw,
      proWalletAddress: users.proWalletAddress,
      proCheckedAt: users.proCheckedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!row) {
    return {
      isPro: false,
      balanceRaw: null,
      walletAddress: null,
      checkedAt: null,
      source: "error",
      error: "User not found",
    };
  }

  if (!forceRefresh && isCacheFresh(row.proCheckedAt)) {
    return {
      isPro: row.isPro,
      balanceRaw: row.proBalanceRaw ?? null,
      walletAddress: row.proWalletAddress ?? null,
      checkedAt: row.proCheckedAt ?? null,
      source: "cache",
    };
  }

  try {
    const addresses = uniqueAddresses([embeddedWalletAddress, externalWalletAddress]);
    const { maxBalance, maxWalletAddress } = await getMaxPigcassoBalance(addresses);
    const { thresholdRaw } = getConfig();
    const isPro = maxBalance >= thresholdRaw;

    const checkedAt = new Date();

    await db
      .update(users)
      .set({
        isPro,
        proBalanceRaw: maxBalance.toString(),
        proWalletAddress: maxWalletAddress,
        proCheckedAt: checkedAt,
        updatedAt: checkedAt,
      })
      .where(eq(users.id, userId));

    return {
      isPro,
      balanceRaw: maxBalance.toString(),
      walletAddress: maxWalletAddress,
      checkedAt,
      source: "refresh",
    };
  } catch (error) {
    if (row.proCheckedAt) {
      return {
        isPro: row.isPro,
        balanceRaw: row.proBalanceRaw ?? null,
        walletAddress: row.proWalletAddress ?? null,
        checkedAt: row.proCheckedAt ?? null,
        source: "cache",
      };
    }

    return {
      isPro: false,
      balanceRaw: null,
      walletAddress: null,
      checkedAt: null,
      source: "error",
      error: error instanceof Error ? error.message : "Unable to verify holdings",
    };
  }
};
