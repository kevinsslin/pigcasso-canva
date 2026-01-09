import { useMutation } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = {
  data: string;
  meta: {
    provider: "gemini";
  };
};

type RequestType = InferRequestType<typeof client.api.ai["edit-image"]["$post"]>["json"];

export const useEditImage = () => {
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["edit-image"].$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to edit image");
    },
  });
};

