"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";

import { QueryProvider } from "@/components/query-provider";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/auth-events";
import { setAuthTokenGetter } from "@/lib/auth-token";

interface ProvidersProps {
  children: React.ReactNode;
};

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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
    </ThemeProvider>
  );
};
