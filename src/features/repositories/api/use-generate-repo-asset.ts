import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";

type GenerateResponse = { data: { imageUrl: string } };

export const useGenerateRepoAsset = () => {
  return useMutation<
    GenerateResponse,
    Error,
    { owner: string; repo: string }
  >({
    mutationFn: async ({ owner, repo }) => {
      const response = await client.api.github.repos[":owner"][":repo"]["generate-asset"].$post(
        {
          param: { owner, repo },
        },
      );

      return readApiResponse<GenerateResponse>(response, ({ status }) => {
        if (status === 429) {
          return "Daily AI limit reached";
        }
        if (status === 404) {
          return "GitHub not connected";
        }
        return "Failed to generate asset";
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate asset");
    },
  });
};
