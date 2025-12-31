import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  deployments: Array<{
    chain_id: string;
    status: "pending" | "deploying" | "live" | "failed";
    contract_address?: string;
    transaction_id?: string;
  }>;
};

export const useGetPrintrDeployments = (
  tokenId: string | null,
  options?: { enabled?: boolean; refetchIntervalMs?: number },
) => {
  const { ready, authenticated } = usePrivy();

  return useQuery<ResponseType, Error>({
    queryKey: ["printr", "deployments", tokenId],
    queryFn: async () => {
      if (!tokenId) {
        throw new Error("Missing token id");
      }

      const response = await client.api.printr.tokens[":id"].deployments.$get({
        param: { id: tokenId },
      });

      return await readApiResponse<ResponseType>(
        response,
        "Failed to fetch deployments",
      );
    },
    enabled: Boolean(tokenId) && (options?.enabled ?? true) && ready && authenticated,
    staleTime: 0,
    refetchInterval: options?.refetchIntervalMs ?? false,
  });
};

