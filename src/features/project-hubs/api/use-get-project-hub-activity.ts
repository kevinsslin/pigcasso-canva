import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ActivityEvent = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  template: {
    id: string;
    name: string;
  };
};

type ResponseType = { data: ActivityEvent[] };

export const useGetProjectHubActivity = (slug: string, options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ActivityEvent[], Error>({
    queryKey: ["project-hub-activity", slug],
    queryFn: async () => {
      const response = await client.api["project-hubs"][":slug"].activity.$get({
        param: { slug },
      });
      const body = await readApiResponse<ResponseType>(response, "Failed to load activity");
      return body.data;
    },
    staleTime: 10_000,
    enabled: (options?.enabled ?? true) && ready && authenticated,
  });
};

