"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type GalleryCanvasListItem = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  stats: {
    likes: number;
    bookmarks: number;
  };
  viewer?: {
    hasLiked: boolean;
    hasBookmarked: boolean;
  };
};

export type GalleryListResponse = {
  data: GalleryCanvasListItem[];
  nextPage: number | null;
};

export const useGetGalleryCanvases = (params?: { sort?: "new" | "top"; limit?: number }) => {
  const { ready, authenticated } = usePrivy();
  const sort = params?.sort ?? "new";
  const limit = params?.limit ?? 24;

  return useInfiniteQuery<GalleryListResponse, Error>({
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryKey: ["gallery-canvases", { sort, auth: authenticated ? "1" : "0" }],
    enabled: ready,
    queryFn: async ({ pageParam }) => {
      const response = await client.api.gallery.canvases.$get({
        query: {
          page: String(pageParam),
          limit: String(limit),
          sort,
        },
      });

      return readApiResponse<GalleryListResponse>(response, "Failed to load gallery");
    },
  });
};

