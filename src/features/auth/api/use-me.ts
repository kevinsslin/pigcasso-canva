import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ResponseType = {
  data: {
    user: {
      id: string;
      privyUserId: string;
      email: string | null;
      name: string | null;
      image: string | null;
      bio: string | null;
      wallets: {
        embedded: string | null;
        external: string | null;
        externals: string[];
      };
    };
    integrations: {
      uploadthing: {
        configured: boolean;
      };
      unsplash: {
        configured: boolean;
      };
    };
    pro: {
      isPro: boolean;
      balanceRaw: string | null;
      walletAddress: string | null;
      checkedAt: string | null;
      source: "cache" | "refresh" | "error";
      error?: string;
    };
    ai: {
      provider: "gemini";
      configured: boolean;
      limits: {
        generate: number;
        removeBg: number;
      };
      usage: {
        date: string;
        generateCount: number;
        removeBgCount: number;
      } | null;
    };
  };
};

export const useMe = (options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType, Error>({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await client.api.me.$get();
      return readApiResponse<ResponseType>(response, "Failed to fetch current user");
    },
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};
