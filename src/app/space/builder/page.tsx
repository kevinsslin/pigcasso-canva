"use client";

import { Loader } from "lucide-react";

import { SpaceBuilder } from "@/features/spaces/components/space-builder";
import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

export default function SpaceBuilderPage() {
  const { ready, authenticated } = useRequireAuth("/space/builder");

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <SpaceBuilder />;
}

