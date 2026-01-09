import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type CanvasDocument = {
  id: string;
  userId: string;
  name: string;
  snapshot: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResponseType = { data: CanvasDocument };

export const useGetCanvas = (id: string, options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<CanvasDocument, Error>({
    enabled: (options?.enabled ?? true) && ready && authenticated && Boolean(id),
    queryKey: ["canvas", { id }],
    queryFn: async () => {
      const response = await client.api.canvases[":id"].$get({ param: { id } });
      const json = await readApiResponse<ResponseType>(response, "Failed to fetch canvas");
      return json.data;
    },
  });
};

