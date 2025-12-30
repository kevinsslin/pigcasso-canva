import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

type ResponseType = InferResponseType<typeof client.api.projects[":id"]["$delete"], 200>;
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

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          extractBodyErrorMessage(body) ?? "Failed to delete project";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
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
