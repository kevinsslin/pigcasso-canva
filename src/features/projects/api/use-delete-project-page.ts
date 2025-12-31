import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<
  (typeof client.api.projects)[":id"]["pages"][":pageId"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.projects)[":id"]["pages"][":pageId"]["$delete"]
>;

export const useDeleteProjectPage = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationKey: ["project", { id: projectId }, "pages"],
    mutationFn: async (params) => {
      const response = await client.api.projects[":id"].pages[":pageId"].$delete(params);
      return readApiResponse<ResponseType>(response, "Failed to delete page");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete page");
    },
  });
};
