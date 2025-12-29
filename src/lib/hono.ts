import { hc } from "hono/client";

import { AppType } from "@/app/api/[[...route]]/route";

import { getAuthToken } from "@/lib/auth-token";

export const client = hc<AppType>(process.env.NEXT_PUBLIC_APP_URL!, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getAuthToken();

    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  },
});
