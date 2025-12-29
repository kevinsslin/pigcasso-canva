import { PrivyClient } from "@privy-io/server-auth";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;

if (!privyAppId) {
  throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
}

if (!privyAppSecret) {
  throw new Error("Missing PRIVY_APP_SECRET");
}

export const privy = new PrivyClient(privyAppId, privyAppSecret);

