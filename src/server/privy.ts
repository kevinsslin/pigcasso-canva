import { PrivyClient } from "@privy-io/server-auth";

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

export const privy: PrivyClient = new Proxy({} as PrivyClient, {
  get(_target, prop) {
    const real = getPrivyClient() as any;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as PrivyClient;
