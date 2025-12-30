import { useMutation } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  data: string;
  meta: {
    provider: "gemini" | "replicate";
  };
};
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
