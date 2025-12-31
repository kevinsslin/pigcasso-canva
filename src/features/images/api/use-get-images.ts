import { useInfiniteQuery } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type UnsplashImage = {
  id: string;
  alt_description?: string | null;
  urls: {
    small?: string;
    thumb?: string;
    regular: string;
  };
  links: {
    html: string;
  };
  user: {
    name: string;
  };
};

export type ResponseType = {
  data: UnsplashImage[];
  nextPage: number | null;
};

type RequestType = InferRequestType<typeof client.api.images.$get>["query"];

export const useGetImages = (options?: {
  enabled?: boolean;
  query?: string;
  limit?: number;
}) => {
  const enabled = options?.enabled ?? true;
  const queryText = options?.query?.trim() ?? "";
  const limit = options?.limit ?? 24;

  const query = useInfiniteQuery<ResponseType, Error>({
    queryKey: ["images", { q: queryText, limit }],
    enabled: enabled && queryText.length > 0,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    queryFn: async ({ pageParam }) => {
      const apiQuery: RequestType = {
        q: queryText,
        page: (pageParam as number).toString(),
        limit: limit.toString(),
      };

      const response = await client.api.images.$get({ query: apiQuery });
      return readApiResponse<ResponseType>(response, "Failed to fetch images");
    },
  });

  return query;
};
