"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type NftAssetListItem = {
  id: string;
  projectId: string;
  projectPageId: string | null;
  chainId: number;
  status: string;
  collectionAddress: string | null;
  tokenId: string | null;
  txHash: string | null;
  metadataUri: string | null;
  imageUri: string | null;
  name: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  projectThumbnailUrl: string | null;
  pageIndex: number | null;
  pageName: string | null;
  pageThumbnailUrl: string | null;
};

type ResponseType = {
  data: NftAssetListItem[];
  nextPage: number | null;
};

export const useListNftAssets = (params?: { page?: string; limit?: string }, options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  const page = params?.page ?? "1";
  const limit = params?.limit ?? "20";

  return useQuery<ResponseType, Error>({
    queryKey: ["nfts", "assets", { page, limit }],
    enabled: (options?.enabled ?? true) && ready && authenticated,
    queryFn: async () => {
      const response = await client.api.assets.$get({
        query: { page, limit },
      });
      return readApiResponse<ResponseType>(response, "Failed to load NFT assets");
    },
    staleTime: 15_000,
  });
};

