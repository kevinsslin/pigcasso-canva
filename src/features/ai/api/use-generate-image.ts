import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<
  typeof client.api.ai["generate-image"]["$post"],
  200
>;
type RequestType = InferRequestType<typeof client.api.ai["generate-image"]["$post"]>["json"];

export const useGenerateImage = () => {
  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async (json) => {
      const response = await client.api.ai["generate-image"].$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to generate image");
    },
  });

  return mutation;
};
