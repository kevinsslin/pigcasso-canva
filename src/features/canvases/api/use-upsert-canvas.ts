import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<(typeof client.api.canvases)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.canvases)["$post"]>["json"];

export const useUpsertCanvas = (options?: { toast?: boolean }) => {
  const queryClient = useQueryClient();
  const showToast = options?.toast ?? true;

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.canvases.$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to create canvas");
    },
    onSuccess: (res) => {
      if (res.data?.id) {
        queryClient.invalidateQueries({ queryKey: ["canvas", { id: res.data.id }] });
      }
      queryClient.invalidateQueries({ queryKey: ["canvases"] });
    },
    onError: (err) => {
      if (showToast) {
        toast.error(err.message || "Failed to create canvas");
      }
    },
  });
};
