"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type NftCollectionListItem = {
  id: string;
  chainId: number;
  address: string | null;
  name: string;
  symbol: string;
  contractUri: string | null;
  createdAt: string;
  updatedAt: string;
};

type ResponseType = {
  data: NftCollectionListItem[];
  nextPage: number | null;
};

export const useListNftCollections = (
  params?: { page?: string; limit?: string },
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  const page = params?.page ?? "1";
  const limit = params?.limit ?? "20";

  return useQuery<ResponseType, Error>({
    queryKey: ["nfts", "collections", { page, limit }],
    enabled: (options?.enabled ?? true) && ready && authenticated,
    queryFn: async () => {
      const response = await client.api.collections.$get({
        query: { page, limit },
      });
      return readApiResponse<ResponseType>(response, "Failed to load NFT collections");
    },
    staleTime: 15_000,
  });
};

