"use client";

import { Loader } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { SpaceBuilder } from "@/features/spaces/components/space-builder";
import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

export default function SpaceBuilderPage() {
  const { ready, authenticated } = useRequireAuth("/space/builder");
  const searchParams = useSearchParams();
  const modeParam = searchParams?.get("mode");
  const initialMode = modeParam === "preview" ? "preview" : "edit";

  if (!ready || !authenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <SpaceBuilder initialMode={initialMode} />;
}
