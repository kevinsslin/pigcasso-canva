import { useInfiniteQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ProjectListItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: string;
};

export type ResponseType = {
  data: ProjectListItem[];
  nextPage: number | null;
};

export const useGetProjects = (options?: { enabled?: boolean; limit?: number }) => {
  const { ready, authenticated } = usePrivy();
  const enabled = (options?.enabled ?? true) && ready && authenticated;
  const limit = options?.limit ?? 5;

  const query = useInfiniteQuery<ResponseType, Error>({
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryKey: ["projects"],
    enabled,
    queryFn: async ({ pageParam }) => {
      const response = await client.api.projects.$get({
        query: {
          page: (pageParam as number).toString(),
          limit: limit.toString(),
        },
      });

      return readApiResponse<ResponseType>(response, "Failed to fetch projects");
    },
  });

  return query;
};
