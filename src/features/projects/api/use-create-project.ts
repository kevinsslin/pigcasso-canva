import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<(typeof client.api.projects)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.projects)["$post"]>["json"];

export const useCreateProject = (options?: { toast?: boolean }) => {
  const queryClient = useQueryClient();
  const showToast = options?.toast ?? true;

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.projects.$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to create project");
    },
    onSuccess: () => {
      if (showToast) {
        toast.success("Project created.");
      }

      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      if (showToast) {
        toast.error(error.message || "Failed to create project.");
      }
    },
  });

  return mutation;
};
