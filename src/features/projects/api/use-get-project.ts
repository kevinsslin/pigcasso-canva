import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type Project = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  pages: Array<{
    id: string;
    projectId: string;
    index: number;
    name: string | null;
    json: string;
    width: number;
    height: number;
    thumbnailUrl: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type ResponseType = { data: Project };

export const useGetProject = (id: string, options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  const query = useQuery({
    enabled: (options?.enabled ?? true) && ready && authenticated && !!id,
    queryKey: ["project", { id }],
    queryFn: async () => {
      const response = await client.api.projects[":id"].$get({
        param: {
          id,
        },
      });

      const body = await readApiResponse<ResponseType>(response, "Failed to fetch project");
      const { data } = body;
      return data;
    },
  });

  return query;
};
