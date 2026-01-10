import { useMutation } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type ExtractTextBlock = {
  text: string;
  box: { x: number; y: number; w: number; h: number };
  font?: "draw" | "sans" | "serif" | "mono";
  size?: "s" | "m" | "l" | "xl";
  color?: "black" | "white" | "grey" | "red" | "orange" | "yellow" | "green" | "blue" | "violet";
  align?: "start" | "middle" | "end";
};

type ResponseType = {
  data: {
    blocks: ExtractTextBlock[];
  };
  meta: {
    provider: "gemini";
  };
};

type RequestType = InferRequestType<typeof client.api.ai["extract-text"]["$post"]>["json"];

export const useExtractText = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["extract-text"].$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to extract text");
    },
  });

  return mutation;
};

