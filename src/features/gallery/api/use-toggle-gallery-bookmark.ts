"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ToggleBookmarkResponse = {
  data: {
    bookmarked: boolean;
    bookmarkCount: number;
  };
};

export const useToggleGalleryBookmark = () => {
  const queryClient = useQueryClient();

  return useMutation<ToggleBookmarkResponse, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const response = await client.api.gallery.canvases[":id"].bookmark.$post({ param: { id } });
      return readApiResponse<ToggleBookmarkResponse>(response, "Failed to update bookmark");
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gallery-canvases"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-canvas", { id: variables.id }] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update bookmark");
    },
  });
};

