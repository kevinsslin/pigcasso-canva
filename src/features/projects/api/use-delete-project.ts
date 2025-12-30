import { toast } from "sonner";
import { InferRequestType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = { data: { id: string } };
type RequestType = InferRequestType<typeof client.api.projects[":id"]["$delete"]>["param"];

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async (param) => {
      const response = await client.api.projects[":id"].$delete({ 
        param,
      });
      return readApiResponse<ResponseType>(response, "Failed to delete project");
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", { id: data.id }] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    }
  });

  return mutation;
};
