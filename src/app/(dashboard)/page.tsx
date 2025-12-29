"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

import { Banner } from "./banner";
import { PresetsSection } from "./presets-section";
import { ProjectsSection } from "./projects-section";
import { TemplatesSection } from "./templates-section";

export default function Home() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/sign-in");
    }
  }, [authenticated, ready, router]);

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
