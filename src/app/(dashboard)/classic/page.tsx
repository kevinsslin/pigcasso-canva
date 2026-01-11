"use client";

import Link from "next/link";
import { useMemo } from "react";
import Image from "next/image";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGetGalleryCanvases } from "@/features/gallery/api/use-get-gallery-canvases";
import { useGetTemplates } from "@/features/projects/api/use-get-templates";

import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/app/(dashboard)/template-card";
import { PresetsSection } from "@/app/(dashboard)/presets-section";
import { ProjectsSection } from "@/app/(dashboard)/projects-section";

type ClassicTab = "projects" | "templates";

const getClassicTab = (value: string | null): ClassicTab => {
  if (value === "templates") return "templates";
  return "projects";
};

export default function ClassicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = getClassicTab(searchParams?.get("tab") ?? null);
  const redirectPath = tab === "templates" ? "/classic?tab=templates" : "/classic";

  const { ready, authenticated } = useRequireAuth(redirectPath);

  const templates = useGetTemplates(
    { page: "1", limit: "12" },
    { enabled: ready && authenticated && tab === "templates" },
  );

  const gallery = useGetGalleryCanvases(
    { sort: "top", limit: 8 },
  );

  const galleryItems = useMemo(() => gallery.data?.pages.flatMap((page) => page.data) ?? [], [gallery.data]);

  const tabs = [
    { key: "projects" as const, label: "Classic Canva", href: "/classic" },
    { key: "templates" as const, label: "Classic Templates", href: "/classic?tab=templates" },
  ];

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full overflow-hidden border bg-white">
              <Image src="/logo-pig.png" alt="Pigcasso" width={36} height={36} className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-semibold">Classic</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            The original Canva-style editor: templates, pages, and exports.
          </p>

          <div className="mt-4 inline-flex items-center gap-1 rounded-full border bg-card/80 p-1 shadow-soft backdrop-blur">
            {tabs.map((item) => {
              const active = tab === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild type="button" variant="secondary" className="rounded-full">
            <Link href="/app">
              <Sparkles className="size-4 mr-2" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>

      {tab === "projects" ? (
        <div className="space-y-10">
          <PresetsSection />
          <ProjectsSection />
        </div>
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Gallery</h2>
              <Button asChild type="button" variant="secondary" className="rounded-full">
                <Link href="/gallery">View all</Link>
              </Button>
            </div>

            {gallery.isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="size-6 text-muted-foreground animate-spin" />
              </div>
            ) : gallery.isError ? (
              <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                {gallery.error?.message || "Failed to load gallery."}
              </div>
            ) : galleryItems.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryItems.slice(0, 8).map((item) => (
                  <TemplateCard
                    key={item.id}
                    title={item.name}
                    imageSrc={item.coverImageUrl ?? ""}
                    onClick={() => {
                      router.push(`/gallery/${item.id}`);
                    }}
                    disabled={false}
                    description="View-only board + chat"
                    width={4}
                    height={3}
                    isPro={null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                No published boards yet.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">Templates</h2>
              <Button asChild type="button" variant="secondary" className="rounded-full">
                <Link href="/templates">Browse</Link>
              </Button>
            </div>

            {templates.isLoading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="size-6 text-muted-foreground animate-spin" />
              </div>
            ) : templates.isError ? (
              <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
                {templates.error?.message || "Failed to load templates."}
              </div>
            ) : templates.data?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {templates.data.map((template) => (
                  <TemplateCard
                    key={template.id}
                    title={template.name}
                    imageSrc={template.thumbnailUrl || ""}
                    onClick={() => {
                      router.push(`/templates/${template.id}`);
                    }}
                    disabled={false}
                    description={`${template.width} x ${template.height} px`}
                    width={template.width}
                    height={template.height}
                    isPro={template.isPro}
                    hasToken={Boolean(template.token?.printrTokenId)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
                No templates yet.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
