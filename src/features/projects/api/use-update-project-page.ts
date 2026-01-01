import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { getApiErrorStatus } from "@/lib/api-error";
import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<
  (typeof client.api.projects)[":id"]["pages"][":pageId"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.projects)[":id"]["pages"][":pageId"]["$patch"]
>;

export const useUpdateProjectPage = (projectId: string) => {
  return useMutation<ResponseType, Error, RequestType>({
    mutationKey: ["project", { id: projectId }],
    mutationFn: async (params) => {
      const response = await client.api.projects[":id"].pages[":pageId"].$patch(params);
      return readApiResponse<ResponseType>(response, "Failed to update page");
    },
    retry: (failureCount, error) => {
      const status = getApiErrorStatus(error);
      if (!status) return false;
      if (status === 408 || status === 429 || status >= 500) {
        return failureCount < 3;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 4000),
    onError: (error) => {
      toast.error(error.message || "Failed to update page");
    },
  });
};
