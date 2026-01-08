import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Daily AI limit reached");
        }
        if (response.status === 404) {
          throw new Error("GitHub not connected");
        }
        throw new Error("Failed to generate asset");
      }

      return await response.json();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate asset");
    },
  });
};

