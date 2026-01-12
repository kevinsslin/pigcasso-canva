import { useMutation } from "@tanstack/react-query";
import { InferRequestType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export type AnalyzeCanvasPromptResult =
  | { route: "generate_image"; prompt: string }
  | { route: "generate_html"; prompt: string }
  | { route: "edit_selected_image"; instruction: string }
  | { route: "ask_clarify"; question: string };

type ResponseType = {
  data: AnalyzeCanvasPromptResult;
  meta: {
    provider: "gemini";
  };
};

type RequestType = InferRequestType<typeof client.api.ai.analyze.$post>["json"];

export const useAnalyzeCanvasPrompt = () => {
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai.analyze.$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to analyze prompt");
    },
  });
};

