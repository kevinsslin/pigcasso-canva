"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { PrivyAuthCard } from "@/features/auth/components/privy-auth-card";

const SignInPage = () => {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/");
    }
  }, [authenticated, ready, router]);

  return <PrivyAuthCard />;
};

export default SignInPage;
