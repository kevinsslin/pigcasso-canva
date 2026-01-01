"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import {
  arbitrum,
  avalanche,
  base,
  blast,
  bsc,
  linea,
  mainnet,
  mantle,
  mode,
  optimism,
  polygon,
  polygonZkEvm,
  scroll,
  zora,
} from "viem/chains";

import { QueryProvider } from "@/components/query-provider";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/auth-events";
import { setAuthTokenGetter } from "@/lib/auth-token";

interface ProvidersProps {
  children: React.ReactNode;
}

const PrivyTokenSync = () => {
  const { getAccessToken, logout, ready, authenticated } = usePrivy();
  const hasHandledUnauthorizedRef = useRef(false);

  useLayoutEffect(() => {
    setAuthTokenGetter(getAccessToken);
  }, [getAccessToken]);

  useEffect(() => {
    if (authenticated) {
      hasHandledUnauthorizedRef.current = false;
    }
  }, [authenticated]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler = () => {
      if (!ready || !authenticated) {
        return;
      }
      if (hasHandledUnauthorizedRef.current) {
        return;
      }
      hasHandledUnauthorizedRef.current = true;
      toast.error("Session expired. Please sign in again.");
      logout();
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler);
  }, [authenticated, logout, ready]);

  return null;
};

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        supportedChains: [
          mantle,
          mainnet,
          base,
          arbitrum,
          optimism,
          polygon,
          avalanche,
          bsc,
          linea,
          blast,
          scroll,
          zora,
          mode,
          polygonZkEvm,
        ],
        defaultChain: mantle,
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
