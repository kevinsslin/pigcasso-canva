import { InferRequestType } from "hono";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import type { Project } from "@/features/projects/api/use-get-project";

type ResponseType = { data: Project["pages"][number] };
type RequestType = InferRequestType<
  (typeof client.api.projects)[":id"]["pages"]["$post"]
>;

export const useCreateProjectPage = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationKey: ["project", { id: projectId }, "pages"],
    mutationFn: async (params) => {
      const response = await client.api.projects[":id"].pages.$post(params);
      return readApiResponse<ResponseType>(response, "Failed to create page");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create page");
    },
  });
};
