"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import { setPostLoginRedirect, toSafeRedirectPath } from "@/lib/post-login-redirect";

export const useOpenApp = (options?: { defaultRedirect?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, login } = usePrivy();
  const [opening, setOpening] = useState(false);
  const handledAutoLoginRef = useRef(false);

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

    setPostLoginRedirect(safeRedirect);
    router.push(`/?open=1&redirect=${encodeURIComponent(safeRedirect)}`);
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
      router.replace(redirectTo);
      return;
    }

    if (handledAutoLoginRef.current) {
      return;
    }
    handledAutoLoginRef.current = true;

    setPostLoginRedirect(redirectTo);
    setOpening(true);
    Promise.resolve(login()).finally(() => setOpening(false));
  }, [authenticated, login, ready, router, searchParams]);

  return { openApp, opening, ready, authenticated };
};
