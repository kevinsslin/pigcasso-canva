import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type Input = {
  title: string;
  prompt: string;
  spec: unknown;
  slides: Array<{ projectId: string; index: number; title: string }>;
};

type ResponseType = { data: { deckId: string } };

export const useCreatePresentationDeck = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType["data"], Error, Input>({
    mutationFn: async (input) => {
      const response = await client.api.presentations.$post({
        json: input,
      });

      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to save deck",
      );

      return body.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["presentations"] });
    },
  });
};

