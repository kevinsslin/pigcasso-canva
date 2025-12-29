"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { PrivyAuthCard } from "@/features/auth/components/privy-auth-card";

const SignUpPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      const redirect = searchParams.get("redirect");
      const nextPath = redirect && redirect.startsWith("/") ? redirect : "/";
      router.replace(nextPath);
    }
  }, [authenticated, ready, router, searchParams]);

  return <PrivyAuthCard />;
};

export default SignUpPage;
