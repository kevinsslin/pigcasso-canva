"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<(typeof client.api.canvases)[":id"]["nft"]["export"]["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.canvases)[":id"]["nft"]["export"]["$post"]>;

export const useExportCanvasNft = (options?: { toast?: boolean }) => {
  const showToast = options?.toast ?? true;

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (params) => {
      const response = await client.api.canvases[":id"].nft.export.$post(params);
      return readApiResponse<ResponseType>(response, "Failed to export NFT");
    },
    onError: (err) => {
      if (showToast) toast.error(err.message || "Failed to export NFT");
    },
  });
};

