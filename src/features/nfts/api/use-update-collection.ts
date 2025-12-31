"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = { data: unknown };

type RequestType = {
  id: string;
  values: {
    address?: string;
    contractUri?: string | null;
  };
};

export const useUpdateNftCollection = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (params) => {
      const response = await client.api.collections[":id"].$patch({
        param: { id: params.id },
        json: params.values,
      });
      return readApiResponse<ResponseType>(response, "Failed to update collection");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfts", "collections"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collection");
    },
  });
};

