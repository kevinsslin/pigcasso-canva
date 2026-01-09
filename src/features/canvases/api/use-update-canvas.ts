import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<(typeof client.api.canvases)[":id"]["$patch"], 200>;
type RequestType = InferRequestType<(typeof client.api.canvases)[":id"]["$patch"]>;

export const useUpdateCanvas = (options?: {
  toast?: boolean;
  invalidate?: boolean;
  invalidateList?: boolean;
}) => {
  const queryClient = useQueryClient();
  const showToast = options?.toast ?? true;
  const shouldInvalidate = options?.invalidate ?? true;
  const shouldInvalidateList = options?.invalidateList ?? true;

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (params) => {
      const response = await client.api.canvases[":id"].$patch(params);
      return readApiResponse<ResponseType>(response, "Failed to update canvas");
    },
    onSuccess: (res) => {
      const id = res.data?.id;
      if (id) {
        if (shouldInvalidate) {
          queryClient.invalidateQueries({ queryKey: ["canvas", { id }] });
        } else {
          queryClient.setQueryData(["canvas", { id }], res.data);
        }
      }
      if (shouldInvalidateList) {
        queryClient.invalidateQueries({ queryKey: ["canvases"] });
      }
    },
    onError: (err) => {
      if (showToast) {
        toast.error(err.message || "Failed to update canvas");
      }
    },
  });
};
