import { PrivyClient } from "@privy-io/server-auth";

import { createLazyProxy } from "@/lib/lazy-proxy";
import { requireEnv } from "@/server/env";

let cachedClient: PrivyClient | null = null;

const getPrivyClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const privyAppId = requireEnv("NEXT_PUBLIC_PRIVY_APP_ID");
  const privyAppSecret = requireEnv("PRIVY_APP_SECRET");

  cachedClient = new PrivyClient(privyAppId, privyAppSecret);
  return cachedClient;
};

export const privy: PrivyClient = createLazyProxy(getPrivyClient);
