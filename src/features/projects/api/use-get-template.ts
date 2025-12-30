import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type Template = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  isPro: boolean;
  creatorWallet: string | null;
  parentProjectId: string | null;
  publishedAt: string | null;
  updatedAt: string;
  json: string | null;
};

export type ResponseType = {
  data: Template;
  locked: boolean;
};

export const useGetTemplate = (
  id: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<ResponseType, Error>({
    queryKey: ["template", { id }],
    queryFn: async () => {
      const response = await client.api.templates[":id"].$get({
        param: { id },
      });

      return readApiResponse<ResponseType>(response, "Failed to fetch template");
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
};
