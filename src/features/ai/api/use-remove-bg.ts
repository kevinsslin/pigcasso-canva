import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  typeof client.api.ai["remove-bg"]["$post"],
  200
>;
type RequestType = InferRequestType<typeof client.api.ai["remove-bg"]["$post"]>["json"];

export const useRemoveBg = () => {
  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async (json) => {
      const response = await client.api.ai["remove-bg"].$post({ json });
      const body = (await response.json()) as any;

      if (!response.ok) {
        const message =
          typeof (body as any)?.error === "string"
            ? (body as any).error
            : "Failed to remove background";

        const error = new Error(message);
        (error as any).status = response.status;
        (error as any).body = body;
        throw error;
      }

      return body as ResponseType;
    },
  });

  return mutation;
};
