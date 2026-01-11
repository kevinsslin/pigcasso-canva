"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<(typeof client.api.canvases)[":id"]["publish"]["$patch"], 200>;
type RequestType = InferRequestType<(typeof client.api.canvases)[":id"]["publish"]["$patch"]>;

export const usePublishCanvas = (options?: { toast?: boolean }) => {
  const queryClient = useQueryClient();
  const showToast = options?.toast ?? true;

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (params) => {
      const response = await client.api.canvases[":id"].publish.$patch(params);
      return readApiResponse<ResponseType>(response, "Failed to update publish status");
    },
    onSuccess: (res) => {
      const id = res.data?.id;
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["canvas", { id }] });
      }
      queryClient.invalidateQueries({ queryKey: ["canvases"] });
    },
    onError: (err) => {
      if (showToast) {
        toast.error(err.message || "Failed to publish board");
      }
    },
  });
};

