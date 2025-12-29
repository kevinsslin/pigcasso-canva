import { PrivyClient } from "@privy-io/server-auth";

import { createLazyProxy } from "@/lib/lazy-proxy";

let cachedClient: PrivyClient | null = null;

const getPrivyClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const privyAppSecret = process.env.PRIVY_APP_SECRET;

  if (!privyAppId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
  }

  if (!privyAppSecret) {
    throw new Error("Missing PRIVY_APP_SECRET");
  }

  cachedClient = new PrivyClient(privyAppId, privyAppSecret);
  return cachedClient;
};

export const privy: PrivyClient = createLazyProxy(getPrivyClient);
