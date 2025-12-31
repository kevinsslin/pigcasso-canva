import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type CreateTemplateTokenInput = {
  templateId: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  external_links?: {
    website?: string;
    x?: string;
    telegram?: string;
  };
  chains: string[];
  initial_buy:
    | { supply_percent: number }
    | { spend_usd: number }
    | { spend_native: string };
  graduation_threshold_per_chain_usd?: 69000 | 250000;
  creatorAddress?: string;
};

type ResponseType = {
  data: {
    id: string;
    templateProjectId: string;
    printrTokenId: string;
    status: string;
  };
  printr: unknown;
};

export const useCreateTemplateToken = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, CreateTemplateTokenInput>({
    mutationFn: async (input) => {
      const response = await client.api.printr["template-tokens"].$post({
        json: input,
      });
      return await readApiResponse<ResponseType>(
        response,
        "Failed to create template token",
      );
    },
    onSuccess: async (data) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: ["template-token", data.data.templateProjectId],
        }),
        queryClient.invalidateQueries({ queryKey: ["templates", "mine"] }),
      ]);
    },
  });
};

