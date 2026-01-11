"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ToggleLikeResponse = {
  data: {
    liked: boolean;
    likeCount: number;
  };
};

export const useToggleGalleryLike = () => {
  const queryClient = useQueryClient();

  return useMutation<ToggleLikeResponse, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const response = await client.api.gallery.canvases[":id"].like.$post({ param: { id } });
      return readApiResponse<ToggleLikeResponse>(response, "Failed to update like");
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-canvases"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-canvas", { id: variables.id }] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update like");
    },
  });
};

