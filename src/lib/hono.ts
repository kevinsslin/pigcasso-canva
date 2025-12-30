import { hc } from "hono/client";

import { AppType } from "@/app/api/[[...route]]/route";

import { getAuthToken } from "@/lib/auth-token";
import { dispatchUnauthorizedEvent } from "@/lib/auth-events";

export const client = hc<AppType>(process.env.NEXT_PUBLIC_APP_URL!, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getAuthToken();
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });

    if (res.status !== 401) {
      return res;
    }

    // Retry once in case Privy token wasn't ready / just refreshed.
    const retryToken = await getAuthToken({ maxWaitMs: 750, retries: 2 });
    if (!retryToken || retryToken === token) {
      if (token) {
        dispatchUnauthorizedEvent();
      }
      return res;
    }

    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set("Authorization", `Bearer ${retryToken}`);

    const retryRes = await fetch(input, {
      ...init,
      headers: retryHeaders,
      credentials: "include",
    });

    if (retryRes.status === 401) {
      dispatchUnauthorizedEvent();
    }

    return retryRes;
  },
});
