import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

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

      return readApiResponse<ResponseType>(response, "Failed to fetch template");
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
};
