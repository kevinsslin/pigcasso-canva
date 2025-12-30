import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { InferRequestType, InferResponseType } from "hono";
import { createApiError, extractBodyErrorMessage, getApiErrorStatus } from "@/lib/api-error";

export type ResponseType = InferResponseType<typeof client.api.templates.$get, 200>;
type RequestType = InferRequestType<typeof client.api.templates.$get>["query"];

export const useGetTemplates = (
  apiQuery: RequestType,
  options?: { enabled?: boolean },
) => {
  const query = useQuery<ResponseType["data"], Error>({
    queryKey: [
      "templates",
      {
        page: apiQuery.page,
        limit: apiQuery.limit,
      },
    ],
    queryFn: async () => {
      const response = await client.api.templates.$get({
        query: apiQuery,
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to fetch templates";
        throw createApiError({ message, status: response.status, body });
      }

      const json = body as ResponseType;
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401) return false;
      return failureCount < 2;
    },
  });

  return query;
};
