import { toast } from "sonner";
import { InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import type { ResponseType as MySpaceResponse } from "@/features/spaces/api/use-my-space-document";

type RequestType = InferRequestType<typeof client.api.spaces.me["$patch"]>["json"];

export const useUpdateMySpaceDocument = () => {
  const queryClient = useQueryClient();

  return useMutation<MySpaceResponse, Error, RequestType>({
    mutationKey: ["space", "me"],
    mutationFn: async (json) => {
      const response = await client.api.spaces.me.$patch({ json });
      return readApiResponse<MySpaceResponse>(response, "Failed to save Space");
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["space", "me"], response.data);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save Space");
    },
  });
};
