import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage, getApiErrorStatus } from "@/lib/api-error";

export type ResponseType = InferResponseType<
  typeof client.api.templates[":id"]["$get"],
  200
>;

export const useGetTemplate = (
  id: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<ResponseType, Error>({
    queryKey: ["template", { id }],
    queryFn: async () => {
      const response = await client.api.templates[":id"].$get({
        param: { id },
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to fetch template";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (status === 401) return false;
      return failureCount < 2;
    },
  });
};
