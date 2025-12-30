import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<typeof client.api.me["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.me["$patch"]>["json"];

export const useUpdateMe = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.me.$patch({ json });
      return readApiResponse<ResponseType>(response, "Failed to update profile");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};
