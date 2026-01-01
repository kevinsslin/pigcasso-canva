import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type DeleteTemplateTokenInput = {
  templateId: string;
};

type ResponseType = {
  ok: true;
};

export const useDeleteTemplateToken = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, DeleteTemplateTokenInput>({
    mutationFn: async (input) => {
      const response = await client.api.printr["template-tokens"][":templateId"].$delete({
        param: { templateId: input.templateId },
      });

      return await readApiResponse<ResponseType>(
        response,
        "Failed to reset template token draft",
      );
    },
    onSuccess: async (_, input) => {
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: ["template-token", input.templateId],
        }),
        queryClient.invalidateQueries({ queryKey: ["templates", "mine"] }),
      ]);
    },
  });
};

