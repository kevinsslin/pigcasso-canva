"use client";

import { useLayoutEffect } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";

import { QueryProvider } from "@/components/query-provider";
import { setAuthTokenGetter } from "@/lib/auth-token";

interface ProvidersProps {
  children: React.ReactNode;
};

const PrivyTokenSync = () => {
  const { getAccessToken } = usePrivy();

  useLayoutEffect(() => {
    setAuthTokenGetter(getAccessToken);
  }, [getAccessToken]);

  return null;
};

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
      }}
    >
      <PrivyTokenSync />
      <QueryProvider>{children}</QueryProvider>
    </PrivyProvider>
  );
};
