import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import { InferResponseType } from "hono";

export type GithubReposResponse = InferResponseType<typeof client.api.github.repos.$get, 200>;

export const useGithubRepos = (options?: { enabled?: boolean }) => {
  return useQuery<GithubReposResponse["data"], Error>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const response = await client.api.github.repos.$get();
      const json = await readApiResponse<GithubReposResponse>(response, ({ status }) =>
        status === 404 ? "GitHub not connected" : "Failed to fetch GitHub repos",
      );
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
};
