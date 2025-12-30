import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  typeof client.api.templates[":id"]["remix"]["$post"],
  200
>;
type RequestType = InferRequestType<typeof client.api.templates[":id"]["remix"]["$post"]>["param"];

export const useRemixTemplate = (options?: { toast?: boolean }) => {
  const queryClient = useQueryClient();

  const showToast = options?.toast ?? true;

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (param) => {
      const response = await client.api.templates[":id"].remix.$post({ param });

      if (!response.ok) {
        const message =
          response.status === 403
            ? "Pro required to remix this template."
            : "Failed to remix template";
        throw new Error(message);
      }

      return await response.json();
    },
    onSuccess: () => {
      if (showToast) {
        toast.success("Project created from template.");
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      if (showToast) {
        toast.error(error.message);
      }
    },
  });

  return mutation;
};
