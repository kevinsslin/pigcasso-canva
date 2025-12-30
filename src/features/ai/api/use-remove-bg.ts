import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

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
      return readApiResponse<ResponseType>(
        response,
        "Failed to remove background",
      );
    },
  });

  return mutation;
};
