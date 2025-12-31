"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ExportResponse = {
  data: {
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
  };
};

type RequestType = {
  projectId: string;
  projectPageId: string;
  imageUrl: string;
  sourceJson: string;
  name?: string;
  description?: string;
};

export const useExportNftAsset = () => {
  const queryClient = useQueryClient();

  return useMutation<ExportResponse, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.assets.export.$post({ json });
      return readApiResponse<ExportResponse>(response, "Failed to export to IPFS");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfts", "assets"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export to IPFS");
    },
  });
};
