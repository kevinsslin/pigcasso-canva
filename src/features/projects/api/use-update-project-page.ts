import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

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
    onError: (error) => {
      toast.error(error.message || "Failed to update page");
    },
  });
};
