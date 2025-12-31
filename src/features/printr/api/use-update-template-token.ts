import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type UpdateTemplateTokenInput = {
  templateId: string;
  txHash?: string;
  status?: "created" | "signed" | "live" | "failed";
};

type ResponseType = {
  data: {
    id: string;
    templateProjectId: string;
    printrTokenId: string;
    status: string;
    txHash: string | null;
  };
};

export const useUpdateTemplateToken = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, UpdateTemplateTokenInput>({
    mutationFn: async (input) => {
      const response = await client.api.printr["template-tokens"][":templateId"].$patch({
        param: { templateId: input.templateId },
        json: {
          ...(input.txHash ? { txHash: input.txHash } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });

      return await readApiResponse<ResponseType>(
        response,
        "Failed to update template token",
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

