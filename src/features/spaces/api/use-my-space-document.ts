import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import type { SpaceDocument } from "@/features/spaces/lib/space-document";

export type MySpaceDocument = {
  document: SpaceDocument;
  publishedDocument: SpaceDocument | null;
  isPublished: boolean;
  updatedAt: string;
};

export type ResponseType = { data: MySpaceDocument };

export const useMySpaceDocument = (options?: { enabled?: boolean }) => {
  const { ready, authenticated } = usePrivy();
  const enabled = (options?.enabled ?? true) && ready && authenticated;

  return useQuery<MySpaceDocument, Error>({
    queryKey: ["space", "me"],
    enabled,
    queryFn: async () => {
      const response = await client.api.spaces.me.$get();
      const body = await readApiResponse<ResponseType>(response, "Failed to fetch Space");
      return body.data;
    },
  });
};
