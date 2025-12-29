import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { InferRequestType, InferResponseType } from "hono";

export type ResponseType = InferResponseType<typeof client.api.templates.$get, 200>;
type RequestType = InferRequestType<typeof client.api.templates.$get>["query"];

export const useGetTemplates = (
  apiQuery: RequestType,
  options?: { enabled?: boolean },
) => {
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

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const json = (await response.json()) as ResponseType;
      return json.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });

  return query;
};
