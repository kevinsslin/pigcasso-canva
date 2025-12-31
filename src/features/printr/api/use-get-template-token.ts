import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type TemplateTokenRecord = {
  id: string;
  templateProjectId: string;
  creatorUserId: string;
  printrTokenId: string;
  creatorAccount: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
  externalLinks: unknown | null;
  chains: string[];
  initialBuy: unknown | null;
  quote: unknown | null;
  payload: unknown | null;
  status: "created" | "signed" | "live" | "failed";
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
};

type ResponseType = {
  data: TemplateTokenRecord;
};

export const useGetTemplateToken = (
  templateId: string | null,
  options?: { enabled?: boolean },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<TemplateTokenRecord | null, Error>({
    queryKey: ["template-token", templateId],
    queryFn: async () => {
      if (!templateId) {
        throw new Error("Missing template id");
      }

      const response = await client.api.printr["template-tokens"][":templateId"].$get({
        param: { templateId },
      });

      if (response.status === 404) {
        return null;
      }

      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to fetch template token",
      );
      return body.data;
    },
    enabled: Boolean(templateId) && (options?.enabled ?? true) && ready && authenticated,
    staleTime: 15_000,
    retry: false,
  });
};
