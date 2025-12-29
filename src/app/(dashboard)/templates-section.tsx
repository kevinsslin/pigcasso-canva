"use client";

import { useRouter } from "next/navigation";
import { Loader, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { usePro } from "@/features/auth/hooks/use-pro";

import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useRemixTemplate } from "@/features/projects/api/use-remix-template";

import { TemplateCard } from "./template-card";

export const TemplatesSection = () => {
  const { isPro } = usePro();
  const router = useRouter();
  const remix = useRemixTemplate();

  const { 
    data, 
    isLoading, 
    isError
  } = useGetTemplates({ page: "1", limit: "4" });

  const onClick = (template: ResponseType["data"][0]) => {
    if (template.isPro && !isPro) {
      toast.error("Pro template locked. Hold 100,000 PIGCASSO to unlock Pro.");
      return;
    }

    remix.mutate(
      { id: template.id },
      {
        onSuccess: ({ data }) => {
          router.push(`/editor/${data.id}`);
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
            Failed to load templates
          </p>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return null;
  }

  return (
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
            disabled={remix.isPending}
            description={`${template.width} x ${template.height} px`}
            width={template.width}
            height={template.height}
            isPro={template.isPro}
          />
        ))}
      </div>
    </div>
  );
};
