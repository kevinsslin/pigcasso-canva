import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { createApiError, extractBodyErrorMessage } from "@/lib/api-error";

type ResponseType = InferResponseType<(typeof client.api.projects)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.projects)["$post"]>["json"];

export const useCreateProject = (options?: { toast?: boolean }) => {
  const queryClient = useQueryClient();
  const showToast = options?.toast ?? true;

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.projects.$post({ json });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message = extractBodyErrorMessage(body) ?? "Failed to create project";
        throw createApiError({ message, status: response.status, body });
      }

      return body as ResponseType;
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
