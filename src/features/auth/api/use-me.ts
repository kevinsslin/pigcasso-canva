import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ResponseType = InferResponseType<typeof client.api.me["$get"], 200>;

export const useMe = (options?: { enabled?: boolean }) => {
  return useQuery<ResponseType, Error>({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await client.api.me.$get();
      return readApiResponse<ResponseType>(response, "Failed to fetch current user");
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};
