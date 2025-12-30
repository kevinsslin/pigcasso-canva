import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<
  typeof client.api["token-gating"]["refresh"]["$post"],
  200
>;

export const useRefreshTokenGating = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api["token-gating"].refresh.$post();
      return readApiResponse<ResponseType>(response, "Failed to refresh token gating");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};
