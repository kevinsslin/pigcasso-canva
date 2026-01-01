import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type TopProjectRow = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  templatesCount: number;
  remixCount: number;
};

type TopCreatorRow = {
  userId: string;
  name: string | null;
  image: string | null;
  remixCount: number;
};

type TopTemplateRow = {
  templateId: string;
  name: string;
  thumbnailUrl: string | null;
  remixCount: number;
  projectHubId: string;
  projectHubSlug: string;
  projectHubName: string;
};

export type GlobalLeaderboards = {
  topProjects: TopProjectRow[];
  topCreators: TopCreatorRow[];
  topTemplates: TopTemplateRow[];
};

type ResponseType = { data: GlobalLeaderboards };

export const useGetGlobalLeaderboards = (
  params?: { limit?: string },
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<GlobalLeaderboards, Error>({
    queryKey: ["global-leaderboards", params],
    queryFn: async () => {
      const response = await client.api.leaderboards.$get({
        query: {
          limit: params?.limit ?? "25",
        },
      });
      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to load leaderboards",
      );
      return body.data;
    },
    staleTime: 10_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};
