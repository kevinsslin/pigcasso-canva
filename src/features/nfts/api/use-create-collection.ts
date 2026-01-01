"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import { MANTLE_CHAIN_ID } from "@/lib/web3-constants";

type ResponseType = {
  data: {
    id: string;
    chainId: number;
    address: string | null;
    name: string;
    symbol: string;
    contractUri: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type RequestType = {
  chainId?: number;
  name: string;
  symbol: string;
  contractUri?: string;
  address?: string;
};

export const useCreateNftCollection = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.collections.$post({
        json: { chainId: MANTLE_CHAIN_ID, ...json },
      });
      return readApiResponse<ResponseType>(response, "Failed to create collection");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfts", "collections"] });
    },
  });
};
