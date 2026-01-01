"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = { data: unknown };

type RequestType = {
  id: string;
  values: {
    status?: string;
    collectionId?: string | null;
    collectionAddress?: string | null;
    tokenId?: string | null;
    txHash?: string | null;
    metadataUri?: string | null;
    imageUri?: string | null;
    name?: string | null;
    description?: string | null;
  };
};

export const useUpdateNftAsset = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (params) => {
      const response = await client.api.assets[":id"].$patch({
        param: { id: params.id },
        json: params.values,
      });
      return readApiResponse<ResponseType>(response, "Failed to update NFT asset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfts", "assets"] });
    },
  });
};
