import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

type ResponseType = InferResponseType<
  typeof client.api["token-gating"]["refresh"]["$post"],
  200
>;

export const useRefreshTokenGating = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api["token-gating"].refresh.$post();

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to refresh token gating";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};
