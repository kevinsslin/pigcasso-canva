import { InferResponseType } from "hono";
import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ResponseType = InferResponseType<typeof client.api.projects[":id"]["$get"], 200>;

export const useGetProject = (id: string, options?: { enabled?: boolean }) => {
  const query = useQuery({
    enabled: (options?.enabled ?? true) && !!id,
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
