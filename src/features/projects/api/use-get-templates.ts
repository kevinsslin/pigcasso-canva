import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { InferRequestType } from "hono";
import { readApiResponse } from "@/lib/api-response";

export type TemplateListItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  isPro: boolean;
  creatorWallet: string | null;
  parentProjectId: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type ResponseType = {
  data: TemplateListItem[];
  nextPage: number | null;
};
type RequestType = InferRequestType<typeof client.api.templates.$get>["query"];

export const useGetTemplates = (
  apiQuery: RequestType,
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  const query = useQuery<ResponseType["data"], Error>({
    queryKey: [
      "templates",
      {
        page: apiQuery.page,
        limit: apiQuery.limit,
      },
    ],
    queryFn: async () => {
      const response = await client.api.templates.$get({
        query: apiQuery,
      });

      const body = await readApiResponse<ResponseType>(response, "Failed to fetch templates");
      return body.data;
    },
    enabled: (options?.enabled ?? true) && ready && authenticated,
    staleTime: 60_000,
  });
 
  return query;
};
