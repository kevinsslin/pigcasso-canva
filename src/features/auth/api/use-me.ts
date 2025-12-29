import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

export type ResponseType = InferResponseType<typeof client.api.me["$get"], 200>;

export const useMe = (options?: { enabled?: boolean }) => {
  return useQuery<ResponseType, Error>({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await client.api.me.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch current user");
      }

      return response.json();
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};
