"use client";

import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";

import { Banner } from "./banner";
import { PresetsSection } from "./presets-section";
import { ProjectsSection } from "./projects-section";
import { TemplatesSection } from "./templates-section";

export default function Home() {
  const { ready, authenticated } = useRequireAuth("/");

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10">
      <Banner />
      <PresetsSection />
      <TemplatesSection />
      <ProjectsSection />
    </div>
  );
};
