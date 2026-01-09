import { useInfiniteQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type CanvasListItem = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResponseType = {
  data: CanvasListItem[];
  nextPage: number | null;
};

export const useGetCanvases = (options?: { enabled?: boolean; limit?: number }) => {
  const { ready, authenticated } = usePrivy();
  const enabled = (options?.enabled ?? true) && ready && authenticated;
  const limit = options?.limit ?? 12;

  return useInfiniteQuery<ResponseType, Error>({
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryKey: ["canvases"],
    enabled,
    queryFn: async ({ pageParam }) => {
      const response = await client.api.canvases.$get({
        query: {
          page: (pageParam as number).toString(),
          limit: limit.toString(),
        },
      });

      return readApiResponse<ResponseType>(response, "Failed to fetch canvases");
    },
  });
};

