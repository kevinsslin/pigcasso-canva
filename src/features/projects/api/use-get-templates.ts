import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { InferRequestType, InferResponseType } from "hono";
import { readApiResponse } from "@/lib/api-response";

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

      const body = await readApiResponse<ResponseType>(response, "Failed to fetch templates");
      return body.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
 
  return query;
};
