import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

type ResponseType = InferResponseType<
  typeof client.api.ai["remove-bg"]["$post"],
  200
>;
type RequestType = InferRequestType<typeof client.api.ai["remove-bg"]["$post"]>["json"];

export const useRemoveBg = () => {
  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async (json) => {
      const response = await client.api.ai["remove-bg"].$post({ json });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to remove background";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
    },
  });

  return mutation;
};
