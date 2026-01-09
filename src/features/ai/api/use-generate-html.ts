import { useMutation } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  data: {
    html: string;
  };
  meta: {
    provider: "gemini";
  };
};

type RequestType = InferRequestType<typeof client.api.ai["generate-html"]["$post"]>["json"];

export const useGenerateHtml = () => {
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["generate-html"].$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to generate HTML");
    },
  });
};

