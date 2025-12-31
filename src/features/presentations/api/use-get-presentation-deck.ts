import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  data: {
    deck: {
      id: string;
      title: string;
      prompt: string;
      spec: unknown;
      createdAt: string;
      updatedAt: string;
    };
    slides: Array<{
      id: string;
      index: number;
      title: string;
      project: {
        id: string;
        name: string;
        width: number;
        height: number;
        thumbnailUrl: string | null;
        updatedAt: string;
      };
    }>;
  };
};

export const useGetPresentationDeck = (
  id: string,
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType["data"], Error>({
    queryKey: ["presentations", "deck", id],
    queryFn: async () => {
      const response = await client.api.presentations[":id"].$get({
        param: { id },
      });

      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to load deck",
      );
      return body.data;
    },
    enabled: (options?.enabled ?? true) && ready && authenticated,
    staleTime: 30_000,
  });
};

