import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  data: {
    remixCount: number;
  };
};

export const useGetTemplateUsage = (
  templateId: string,
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType["data"], Error>({
    queryKey: ["templates", templateId, "usage"],
    queryFn: async () => {
      const response = await client.api.templates[":id"].usage.$get({
        param: { id: templateId },
      });
      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to fetch template usage",
      );
      return body.data;
    },
    enabled: (options?.enabled ?? true) && ready && authenticated,
    staleTime: 30_000,
  });
};

