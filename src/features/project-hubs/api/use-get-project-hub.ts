import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ProjectHubDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  links: {
    website: string | null;
    x: string | null;
    discord: string | null;
    telegram: string | null;
  };
  stats: {
    templatesCount: number;
    remixCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

type ResponseType = { data: ProjectHubDetail };

export const useGetProjectHub = (slug: string, options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ProjectHubDetail, Error>({
    queryKey: ["project-hub", slug],
    queryFn: async () => {
      const response = await client.api["project-hubs"][":slug"].$get({
        param: { slug },
      });
      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to load project",
      );
      return body.data;
    },
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};

