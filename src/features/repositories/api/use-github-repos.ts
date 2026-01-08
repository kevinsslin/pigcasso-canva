import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { InferResponseType } from "hono";

export type GithubReposResponse = InferResponseType<typeof client.api.github.repos.$get, 200>;

export const useGithubRepos = (options?: { enabled?: boolean }) => {
  return useQuery<GithubReposResponse["data"], Error>({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const response = await client.api.github.repos.$get();
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("GitHub not connected");
        }
        throw new Error("Failed to fetch GitHub repos");
      }
      const json = (await response.json()) as GithubReposResponse;
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
};

