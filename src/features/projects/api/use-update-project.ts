import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import type { Project } from "@/features/projects/api/use-get-project";

type ResponseType = InferResponseType<typeof client.api.projects[":id"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.projects[":id"]["$patch"]>["json"];

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationKey: ["project", { id }],
    mutationFn: async (json) => {
      const response = await client.api.projects[":id"].$patch({ 
        json,
        param: { id },
      });
      return readApiResponse<ResponseType>(response, "Failed to update project");
    },
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.setQueryData<Project>(["project", { id }], (existing) => {
        if (!existing) return existing;
        const nextName = typeof variables?.name === "string" ? variables.name : null;
        return nextName ? { ...existing, name: nextName } : existing;
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project");
    }
  });

  return mutation;
};
