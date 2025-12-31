"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
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
          toast.success("Opening editor…", { id: toastId });
          setTransitioning(true);
          router.push(`/editor/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create project", { id: toastId });
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
      <div className="relative overflow-hidden rounded-xl border bg-white">
        <Image
          src="/pig-banner.png"
          alt="Pigcasso"
          width={1500}
          height={500}
          priority
          className="w-full h-auto"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent" />
        <div className="absolute inset-0 p-6 flex items-center">
          <div className="max-w-xl">
            <h1 className="text-xl md:text-3xl font-semibold text-[#111827]">
              Pigcasso Canvas
            </h1>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              Web3-native editor with token-gated Pro packs, creator templates, and an assistant that edits your canvas.
            </p>
            <Button
              disabled={mutation.isPending || transitioning}
              onClick={onClick}
              variant="secondary"
              className="mt-4 w-[180px]"
            >
              Start creating
              {mutation.isPending || transitioning ? (
                <Loader2 className="size-4 ml-2 animate-spin" />
              ) : (
                <ArrowRight className="size-4 ml-2" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
