"use client";

import { useRouter } from "next/navigation";
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
      <div className="text-[#111827] aspect-[5/1] min-h-[248px] flex gap-x-6 p-6 items-center rounded-xl bg-gradient-to-r from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]">
        <div className="rounded-full size-28 items-center justify-center bg-white/50 hidden md:flex">
          <div className="rounded-full size-20 flex items-center justify-center bg-white">
            <Sparkles className="h-20 text-[#25D6FF] fill-[#25D6FF]" />
          </div>
        </div>
        <div className="flex flex-col gap-y-2">
          <h1 className="text-xl md:text-3xl font-semibold">
            Pigcasso Canvas
          </h1>
          <p className="text-xs md:text-sm mb-2">
            Web3-native editor with token-gated Pro packs, creator templates, and an assistant that edits your canvas.
          </p>
          <Button
            disabled={mutation.isPending || transitioning}
            onClick={onClick}
            variant="secondary"
            className="w-[160px]"
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
    </>
  );
};
