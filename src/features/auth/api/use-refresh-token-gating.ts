import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  typeof client.api["token-gating"]["refresh"]["$post"],
  200
>;

export const useRefreshTokenGating = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api["token-gating"].refresh.$post();

      if (!response.ok) {
        throw new Error("Failed to refresh token gating");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};

