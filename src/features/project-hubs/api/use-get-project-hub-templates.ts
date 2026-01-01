import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ProjectHubTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  isPro: boolean;
  templateCategory: string | null;
  creatorWallet: string | null;
  parentProjectId: string | null;
  publishedAt: string | null;
  updatedAt: string;
  token: {
    printrTokenId: string | null;
    status: string | null;
  };
};

export type ResponseType = {
  data: ProjectHubTemplate[];
  nextPage: number | null;
};

export const useGetProjectHubTemplates = (
  slug: string,
  params: { page: string; limit: string; category?: string },
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType, Error>({
    queryKey: ["project-hub-templates", slug, params],
    queryFn: async () => {
      const response = await client.api["project-hubs"][":slug"].templates.$get({
        param: { slug },
        query: params,
      });
      return readApiResponse<ResponseType>(response, "Failed to load templates");
    },
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};

