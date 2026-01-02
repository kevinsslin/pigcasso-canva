"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

const toSafeRedirectPath = (value: string | null) => {
  if (!value) return "/app";
  if (!value.startsWith("/")) return "/app";
  if (value.startsWith("//")) return "/app";
  return value;
};

export const useOpenApp = (options?: { defaultRedirect?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, login } = usePrivy();
  const [opening, setOpening] = useState(false);
  const handledAutoLoginRef = useRef(false);
  const [postLoginRedirect, setPostLoginRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !postLoginRedirect) {
      return;
    }
    router.replace(postLoginRedirect);
    setPostLoginRedirect(null);
  }, [authenticated, postLoginRedirect, ready, router]);

  const openApp = async (redirectTo = options?.defaultRedirect ?? "/app") => {
    if (!ready) {
      toast.message("Loading…");
      return;
    }
    const safeRedirect = toSafeRedirectPath(redirectTo);

    if (authenticated) {
      router.push(safeRedirect);
      return;
    }

    handledAutoLoginRef.current = true;
    setPostLoginRedirect(safeRedirect);
    setOpening(true);
    try {
      await login();
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    if (!ready) {
      return;
    }

    const open = searchParams?.get("open") === "1";
    if (!open) {
      handledAutoLoginRef.current = false;
      return;
    }

    const redirectTo = toSafeRedirectPath(searchParams?.get("redirect"));

    if (authenticated) {
      if (!postLoginRedirect) {
        router.replace(redirectTo);
      }
      return;
    }

    if (handledAutoLoginRef.current) {
      return;
    }
    handledAutoLoginRef.current = true;

    setPostLoginRedirect(redirectTo);
    setOpening(true);
    Promise.resolve(login()).finally(() => setOpening(false));
  }, [authenticated, login, postLoginRedirect, ready, router, searchParams]);

  return { openApp, opening, ready, authenticated };
};

