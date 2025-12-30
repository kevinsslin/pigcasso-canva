import { InferResponseType } from "hono";
import { useInfiniteQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage, getApiErrorStatus } from "@/lib/api-error";

export type ResponseType = InferResponseType<typeof client.api.projects["$get"], 200>;

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

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message = extractBodyErrorMessage(body) ?? "Failed to fetch projects";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
    },
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401) return false;
      return failureCount < 2;
    },
  });

  return query;
};
