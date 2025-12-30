import { InferResponseType } from "hono";
import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage, getApiErrorStatus } from "@/lib/api-error";

export type ResponseType = InferResponseType<typeof client.api.projects[":id"]["$get"], 200>;

export const useGetProject = (id: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    enabled: (options?.enabled ?? true) && !!id,
    queryKey: ["project", { id }],
    queryFn: async () => {
      const response = await client.api.projects[":id"].$get({
        param: {
          id,
        },
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message = extractBodyErrorMessage(body) ?? "Failed to fetch project";
        throw createApiError({ message, status: response.status, body });
      }

      const { data } = body as ResponseType;
      return data;
    },
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401) return false;
      return failureCount < 2;
    },
  });

  return query;
};
