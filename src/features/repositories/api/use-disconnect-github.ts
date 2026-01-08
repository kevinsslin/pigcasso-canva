import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";

export const useDisconnectGithub = () => {
  const queryClient = useQueryClient();

  return useMutation<{ data: { connected: boolean } }, Error, void>({
    mutationFn: async () => {
      const response = await client.api.github.disconnect.$post();
      return readApiResponse<{ data: { connected: boolean } }>(
        response,
        "Failed to disconnect GitHub",
      );
    },
    onSuccess: () => {
      toast.success("GitHub disconnected.");
      queryClient.invalidateQueries({ queryKey: ["github-connection"] });
      queryClient.invalidateQueries({ queryKey: ["github-repos"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to disconnect GitHub");
    },
  });
};
