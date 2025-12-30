import { useInfiniteQuery } from "@tanstack/react-query";

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

export const useGetProjects = () => {
  const query = useInfiniteQuery<ResponseType, Error>({
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryKey: ["projects"],
    queryFn: async ({ pageParam }) => {
      const response = await client.api.projects.$get({
        query: {
          page: (pageParam as number).toString(),
          limit: "5",
        },
      });

      return readApiResponse<ResponseType>(response, "Failed to fetch projects");
    },
  });

  return query;
};
