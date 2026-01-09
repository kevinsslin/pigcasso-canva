"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { setPostLoginRedirect, toSafeRedirectPath } from "@/lib/post-login-redirect";

export const useRequireAuth = (redirectPath: string) => {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      const safePath = toSafeRedirectPath(redirectPath, "/app");
      setPostLoginRedirect(safePath);
      router.replace(`/?open=1&redirect=${encodeURIComponent(safePath)}`);
    }
  }, [authenticated, ready, redirectPath, router]);

  return { ready, authenticated };
};
