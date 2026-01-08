import { useQuery } from "@tanstack/react-query";

import { InferResponseType } from "hono";

import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.github.connection.$get, 200>;

export const useGithubConnection = (options?: { enabled?: boolean }) => {
  return useQuery<ResponseType["data"], Error>({
    queryKey: ["github-connection"],
    queryFn: async () => {
      const response = await client.api.github.connection.$get();
      const json = await readApiResponse<ResponseType>(
        response,
        "Failed to fetch GitHub connection",
      );
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
};
