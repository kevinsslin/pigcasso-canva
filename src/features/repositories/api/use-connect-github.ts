import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

type ResponseType = InferResponseType<(typeof client.api.github.connect)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.github.connect)["$post"]>["json"];

export const useConnectGithub = () => {
  const queryClient = useQueryClient();

  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.github.connect.$post({ json });
      return readApiResponse<ResponseType>(response, "Failed to connect GitHub");
    },
    onSuccess: (res) => {
      toast.success(
        res.data?.username ? `GitHub connected: ${res.data.username}` : "GitHub connected",
      );
      queryClient.invalidateQueries({ queryKey: ["github-connection"] });
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to connect GitHub");
    },
  });
};
