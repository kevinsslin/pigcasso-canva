import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

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

      if (!response.ok) {
        throw new Error("Failed to fetch template");
      }

      return response.json();
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
};

