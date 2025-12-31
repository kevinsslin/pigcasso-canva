import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import type { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type MyTemplateListItem = {
  id: string;
  name: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  isPro: boolean;
  creatorWallet: string | null;
  parentProjectId: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  token: {
    printrTokenId: string | null;
    status: string | null;
  };
};

export type ResponseType = {
  data: MyTemplateListItem[];
};

type RequestType = InferRequestType<typeof client.api.templates.mine.$get>["query"];

export const useGetMyTemplates = (params?: RequestType) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType["data"], Error>({
    queryKey: ["templates", "mine", params?.publicOnly ?? "true"],
    queryFn: async () => {
      const response = await client.api.templates.mine.$get({
        query: params ?? {},
      });
      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to fetch templates",
      );
      return body.data;
    },
    enabled: ready && authenticated,
    staleTime: 30_000,
  });
};
