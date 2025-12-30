import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

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

export const useGetImages = () => {
  const query = useQuery<UnsplashImage[], Error>({
    queryKey: ["images"],
    queryFn: async () => {
      const response = await client.api.images.$get();
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to fetch images";
        throw createApiError({ message, status: response.status, body });
      }

      return (body as { data: UnsplashImage[] }).data;
    },
  });

  return query;
};
