"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGetTemplates } from "@/features/projects/api/use-get-templates";

import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/app/(dashboard)/template-card";

export default function TemplatesIndexPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth("/templates");

  const [page, setPage] = useState(1);
  const limit = 12;

  const query = useGetTemplates(
    {
      page: String(page),
      limit: String(limit),
    },
    { enabled: ready && authenticated },
  );

  const canPrev = page > 1;
  const canNext = (query.data?.length ?? 0) === limit;

  const title = useMemo(
    () => (query.data?.length ? "Creator Hub" : "No templates yet"),
    [query.data?.length],
  );

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10 px-4 sm:px-6">
      <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse public templates and remix in one click.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/app")}>
            Back
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 text-muted-foreground animate-spin" />
        </div>
      ) : null}

      {query.isError ? (
        <div className="rounded-lg border p-4 text-sm">
          {query.error?.message || "Failed to load templates."}
        </div>
      ) : null}

      {query.data?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {query.data.map((template) => (
            <TemplateCard
              key={template.id}
              title={template.name}
              imageSrc={template.thumbnailUrl || ""}
              onClick={() => router.push(`/templates/${template.id}`)}
              disabled={false}
              description={`${template.width} x ${template.height} px`}
              width={template.width}
              height={template.height}
              isPro={template.isPro}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev || query.isLoading}
        >
          Previous
        </Button>
        <div className="text-xs text-muted-foreground">Page {page}</div>
        <Button
          variant="secondary"
          onClick={() => setPage((p) => p + 1)}
          disabled={!canNext || query.isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
