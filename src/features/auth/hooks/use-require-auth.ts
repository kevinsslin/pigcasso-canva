"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const toSafeRedirectPath = (path: string) => {
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return "/";
};

export const useRequireAuth = (redirectPath: string) => {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      const safePath = toSafeRedirectPath(redirectPath);
      router.replace(`/?open=1&redirect=${encodeURIComponent(safePath)}`);
    }
  }, [authenticated, ready, redirectPath, router]);

  return { ready, authenticated };
};
