"use client";

import { useRouter } from "next/navigation";
import { Loader, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { usePro } from "@/features/auth/hooks/use-pro";

import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useRemixTemplate } from "@/features/projects/api/use-remix-template";

import { TemplateCard } from "./template-card";
import { LoadingOverlay } from "@/components/loading-overlay";

export const TemplatesSection = () => {
  const { isPro } = usePro();
  const router = useRouter();
  const remix = useRemixTemplate({ toast: false });
  const [transitioning, setTransitioning] = useState<{
    name: string;
    width: number;
    height: number;
  } | null>(null);

  const { 
    data, 
    isLoading, 
    isError,
    error,
  } = useGetTemplates({ page: "1", limit: "4" });

  const onClick = (template: ResponseType["data"][0]) => {
    if (template.isPro && !isPro) {
      toast.error("Pro template locked. Hold 100,000 PIGCASSO to unlock Pro.");
      return;
    }

    const toastId = toast.loading("Creating from template…", {
      description: `${template.name} · ${template.width}×${template.height}`,
    });

    remix.mutate(
      { id: template.id },
      {
        onSuccess: ({ data }) => {
          toast.success("Opening editor…", { id: toastId, duration: 3000 });
          setTransitioning({
            name: template.name,
            width: template.width,
            height: template.height,
          });
          router.push(`/editor/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create from template", { id: toastId, duration: 3000 });
          setTransitioning(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Start from a template
        </h3>
        <div className="flex items-center justify-center h-32">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Start from a template
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <TriangleAlert className="size-6 text-muted-foreground" />
          <p>
            {error?.message || "Failed to load templates"}
          </p>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return null;
  }

  return (
    <>
      <LoadingOverlay
        open={remix.isPending || Boolean(transitioning)}
        title="Preparing your canvas…"
        description={
          transitioning
            ? `${transitioning.name} · ${transitioning.width}×${transitioning.height}`
            : undefined
        }
      />
      <div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold text-lg">Start from a template</h3>
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="text-sm text-muted-foreground hover:underline"
        >
          Browse all
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 mt-4 gap-4">
        {data?.map((template) => (
          <TemplateCard
            key={template.id}
            title={template.name}
            imageSrc={template.thumbnailUrl || ""}
            onClick={() => onClick(template)}
            disabled={remix.isPending || Boolean(transitioning)}
            description={`${template.width} x ${template.height} px`}
            width={template.width}
            height={template.height}
            isPro={template.isPro}
            hasToken={Boolean(template.token?.printrTokenId)}
          />
        ))}
      </div>
      </div>
    </>
  );
};
