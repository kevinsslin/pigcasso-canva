"use client";

import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { SpaceBuilder } from "@/features/spaces/components/space-builder";

export default function SpaceBuilderPage() {
  const { ready, authenticated } = useRequireAuth("/space/builder");

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return <SpaceBuilder />;
}
