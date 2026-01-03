import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ResolveSpaceNftRequest = {
  chainId: number;
  contractAddress: string;
  tokenId: string;
  walletAddress?: string | null;
};

export type ResolveSpaceNftResponse = {
  data: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    tokenUri: string | null;
    tokenStandard: "erc721" | "erc1155" | "unknown";
    name: string | null;
    imageUrl: string | null;
    ownedBy: string | null;
  };
};

export const useResolveSpaceNft = () => {
  return useMutation<ResolveSpaceNftResponse, Error, ResolveSpaceNftRequest>({
    mutationKey: ["space", "nfts", "resolve"],
    mutationFn: async (json) => {
      const response = await client.api.spaces.nfts.resolve.$post({ json });
      return readApiResponse<ResolveSpaceNftResponse>(response, "Failed to load NFT metadata");
    },
  });
};

