"use client";

import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { PresetsSection } from "../presets-section";
import { ProjectsSection } from "../projects-section";
import { TemplatesSection } from "../templates-section";

export default function CreatorHubPage() {
  const { ready, authenticated } = useRequireAuth("/creator-hub");

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 max-w-screen-xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold">Creator Hub</h1>
        <p className="text-sm text-muted-foreground">
          Presets, templates, and your projects in one place.
        </p>
      </div>

      <PresetsSection />
      <TemplatesSection />
      <ProjectsSection />
    </div>
  );
}

