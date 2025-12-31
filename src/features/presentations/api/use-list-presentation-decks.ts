import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type DeckListItem = {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

type ResponseType = {
  data: DeckListItem[];
  nextPage: number | null;
};

export const useListPresentationDecks = (
  params: { page: number; limit: number },
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType, Error>({
    queryKey: ["presentations", "list", params],
    queryFn: async () => {
      const response = await client.api.presentations.$get({
        query: {
          page: String(params.page),
          limit: String(params.limit),
        },
      });

      return await readApiResponse<ResponseType>(
        response,
        "Failed to load presentations",
      );
    },
    enabled: (options?.enabled ?? true) && ready && authenticated,
    staleTime: 15_000,
  });
};

