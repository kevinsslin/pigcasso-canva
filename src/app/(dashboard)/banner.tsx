"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { LoadingOverlay } from "@/components/loading-overlay";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Banner = () => {
  const [transitioning, setTransitioning] = useState(false);
  const router = useRouter();
  const mutation = useCreateProject({ toast: false });

  const onClick = () => {
    const toastId = toast.loading("Creating project…", {
      description: "Setting up a 1080×1350 canvas.",
    });

    mutation.mutate(
      {
        name: "X Post (4:5)",
        json: "",
        width: 1080,
        height: 1350,
      },
      {
        onSuccess: ({ data }) => {
          toast.success("Opening editor…", { id: toastId, duration: 3000 });
          setTransitioning(true);
          router.push(`/editor/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create project", { id: toastId, duration: 3000 });
          setTransitioning(false);
        },
      }
    );
  };

  return (
    <>
      <LoadingOverlay
        open={mutation.isPending || transitioning}
        title="Preparing your canvas…"
        description="This can take a few seconds the first time."
      />
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-xl">
        <Image
          src="/pig-banner.png"
          alt="Pigcasso"
          width={1500}
          height={500}
          priority
          className="w-full h-auto"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
        <div className="absolute inset-0 p-7 md:p-10 flex items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              <Sparkles className="size-4" />
              AI Powered
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              What will you create today?
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground font-medium">
              Design on a Web3-native canvas with creator templates, token-gated Pro packs, and a Pigcasso assistant that can draft edits before you apply them.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                disabled={mutation.isPending || transitioning}
                onClick={onClick}
                className="rounded-full px-6 shadow-lg shadow-pink-500/25"
              >
                Create a design
                {mutation.isPending || transitioning ? (
                  <Loader2 className="size-4 ml-2 animate-spin" />
                ) : (
                  <ArrowRight className="size-4 ml-2" />
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending || transitioning}
                onClick={() => router.push("/presentations/new")}
                className="rounded-full px-6"
              >
                Generate AI slides
                <Sparkles className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
