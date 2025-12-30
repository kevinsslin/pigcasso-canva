import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

type ResponseType = InferResponseType<typeof client.api.me["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.me["$patch"]>["json"];

export const useUpdateMe = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.me.$patch({ json });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message = extractBodyErrorMessage(body) ?? "Failed to update profile";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};
