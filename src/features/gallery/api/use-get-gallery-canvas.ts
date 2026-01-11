"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

import type { GalleryCanvasListItem } from "@/features/gallery/api/use-get-gallery-canvases";

export type GalleryCanvasDetail = GalleryCanvasListItem & {
  snapshot: string | null;
  chatJson: string | null;
};

export type GalleryDetailResponse = { data: GalleryCanvasDetail };

export const useGetGalleryCanvas = (id: string, options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<GalleryCanvasDetail, Error>({
    enabled: (options?.enabled ?? true) && ready && Boolean(id),
    queryKey: ["gallery-canvas", { id, auth: authenticated ? "1" : "0" }],
    queryFn: async () => {
      const response = await client.api.gallery.canvases[":id"].$get({ param: { id } });
      const json = await readApiResponse<GalleryDetailResponse>(response, "Failed to load board");
      return json.data;
    },
  });
};

