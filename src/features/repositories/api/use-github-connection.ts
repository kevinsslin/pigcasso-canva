import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { InferResponseType } from "hono";

type ResponseType = InferResponseType<typeof client.api.github.connection.$get, 200>;

export const useGithubConnection = (options?: { enabled?: boolean }) => {
  return useQuery<ResponseType["data"], Error>({
    queryKey: ["github-connection"],
    queryFn: async () => {
      const response = await client.api.github.connection.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch GitHub connection");
      }
      const json = (await response.json()) as ResponseType;
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
};

