import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ContributorRow = {
  userId: string;
  name: string | null;
  image: string | null;
  remixCount: number;
};

type TemplateRow = {
  templateId: string;
  name: string;
  thumbnailUrl: string | null;
  remixCount: number;
};

export type ProjectHubLeaderboards = {
  topContributors: ContributorRow[];
  topTemplates: TemplateRow[];
};

type ResponseType = { data: ProjectHubLeaderboards };

export const useGetProjectHubLeaderboards = (
  slug: string,
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ProjectHubLeaderboards, Error>({
    queryKey: ["project-hub-leaderboards", slug],
    queryFn: async () => {
      const response = await client.api["project-hubs"][":slug"].leaderboards.$get({
        param: { slug },
      });
      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to load leaderboards",
      );
      return body.data;
    },
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};

