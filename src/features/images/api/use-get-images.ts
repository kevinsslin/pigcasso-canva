import { useQuery } from "@tanstack/react-query";

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

export const useGetImages = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;

  const query = useQuery<UnsplashImage[], Error>({
    queryKey: ["images"],
    enabled,
    queryFn: async () => {
      const response = await client.api.images.$get();
      const body = await readApiResponse<{ data: UnsplashImage[] }>(
        response,
        "Failed to fetch images",
      );
      return body.data;
    },
  });

  return query;
};
