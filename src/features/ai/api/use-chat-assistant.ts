import { useMutation } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  data: {
    text: string;
  };
  meta: {
    provider: "gemini";
  };
};

type RequestType = InferRequestType<typeof client.api.ai.chat.$post>["json"];

export const useChatAssistant = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai.chat.$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to chat with assistant");
    },
  });

  return mutation;
};

