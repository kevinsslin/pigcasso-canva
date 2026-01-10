import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ProjectHub = {
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
  updatedAt: string;
};

export type ResponseType = {
  data: ProjectHub[];
  nextPage: number | null;
};

export const useGetProjectHubs = (
  params: { page: string; limit: string },
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType, Error>({
    queryKey: ["project-hubs", params],
    queryFn: async () => {
      const response = await client.api["project-hubs"].$get({
        query: params,
      });
      return readApiResponse<ResponseType>(response, "Failed to load projects");
    },
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};
