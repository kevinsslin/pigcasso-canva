import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

export type ResponseType = InferResponseType<typeof client.api.me["$get"], 200>;

export const useMe = (options?: { enabled?: boolean }) => {
  return useQuery<ResponseType, Error>({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await client.api.me.$get();

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to fetch current user";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};
