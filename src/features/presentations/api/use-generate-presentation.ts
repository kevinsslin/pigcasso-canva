import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import type { PresentationDeckSpec, PresentationTone } from "@/features/presentations/types";

type Input = {
  topic: string;
  audience?: string;
  slideCount?: number;
  tone?: PresentationTone;
  language?: "en" | "zh";
};

type ResponseType = { data: PresentationDeckSpec };

export const useGeneratePresentation = () => {
  return useMutation<PresentationDeckSpec, Error, Input>({
    mutationFn: async (input) => {
      const response = await client.api.presentations.generate.$post({
        json: input,
      });

      const body = await readApiResponse<ResponseType>(
        response,
        "Failed to generate slides",
      );

      return body.data;
    },
  });
};

