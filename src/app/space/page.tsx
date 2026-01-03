"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

export default function SpacePage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth("/space");

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/space/builder");
    }
  }, [authenticated, ready, router]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader className="size-6 text-muted-foreground animate-spin" />
    </div>
  );
}

