"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, Download, ExternalLink, Loader, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { usePro } from "@/features/auth/hooks/use-pro";
import { useRemixTemplate } from "@/features/projects/api/use-remix-template";
import { useGetProjectHub } from "@/features/project-hubs/api/use-get-project-hub";
import { useGetProjectHubActivity } from "@/features/project-hubs/api/use-get-project-hub-activity";
import { useGetProjectHubLeaderboards } from "@/features/project-hubs/api/use-get-project-hub-leaderboards";
import { useGetProjectHubTemplates } from "@/features/project-hubs/api/use-get-project-hub-templates";

import { client } from "@/lib/hono";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { TemplateCard } from "../../template-card";
import { LoadingOverlay } from "@/components/loading-overlay";

const CATEGORY_OPTIONS = [
  { value: "avatar", label: "Avatar Templates" },
  { value: "sticker", label: "Sticker Hub" },
  { value: "seasonal", label: "Seasonal" },
  { value: "campaign", label: "Campaign" },
  { value: "other", label: "Other" },
] as const;

export default function ProjectHubPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug;
  const router = useRouter();

  const { ready, authenticated } = useRequireAuth(
    slug ? `/projects/${encodeURIComponent(slug)}` : "/projects",
  );
  const { isPro } = usePro({ enabled: ready && authenticated });

  const hub = useGetProjectHub(slug ?? "", { enabled: Boolean(slug) && ready && authenticated });
  const leaderboards = useGetProjectHubLeaderboards(slug ?? "", {
    enabled: Boolean(slug) && ready && authenticated,
  });
  const activity = useGetProjectHubActivity(slug ?? "", {
    enabled: Boolean(slug) && ready && authenticated,
  });

  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("avatar");
  const templates = useGetProjectHubTemplates(
    slug ?? "",
    { page: "1", limit: "12", category },
    { enabled: Boolean(slug) && ready && authenticated },
  );

  const remix = useRemixTemplate({ toast: false });
  const [transitioning, setTransitioning] = useState<{
    name: string;
    width: number;
    height: number;
  } | null>(null);

  const downloadCsv = async () => {
    const toastId = toast.loading("Preparing CSV…");
    try {
      const response = await client.api["project-hubs"][":slug"].rewards["airdrop.csv"].$get({
        param: { slug: slug ?? "" },
      });

	      if (!response.ok) {
	        const body = (await response.json().catch(() => null)) as { error?: string } | null;
	        throw new Error(body?.error || "Failed to download CSV");
	      }

      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug ?? "project"}-airdrop.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Downloaded.", { id: toastId, duration: 2500 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download CSV", {
        id: toastId,
        duration: 4000,
      });
    }
  };

  const onClickTemplate = (template: NonNullable<typeof templates.data>["data"][number]) => {
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

  const templateRows = templates.data?.data ?? [];
  const topContributors = leaderboards.data?.topContributors ?? [];
  const topTemplates = leaderboards.data?.topTemplates ?? [];
  const activityRows = activity.data ?? [];

  const links = hub.data?.links ?? {
    website: null,
    x: null,
    discord: null,
    telegram: null,
  };

  const linkItems = useMemo(() => {
    const entries: Array<{ label: string; href: string }> = [];
    if (links.website) entries.push({ label: "Website", href: links.website });
    if (links.x) entries.push({ label: "X", href: links.x });
    if (links.discord) entries.push({ label: "Discord", href: links.discord });
    if (links.telegram) entries.push({ label: "Telegram", href: links.telegram });
    return entries;
  }, [links.discord, links.telegram, links.website, links.x]);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (hub.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (hub.isError || !hub.data) {
    return (
      <div className="max-w-screen-xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Link>
          </Button>
        </div>
        <div className="rounded-lg border p-4 flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Failed to load project</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {hub.error?.message ?? "Not found"}
            </div>
          </div>
        </div>
      </div>
    );
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
      <div className="max-w-screen-xl mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              <ArrowLeft className="mr-2 size-4" />
              Projects
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void downloadCsv()}>
            <Download className="mr-2 size-4" />
            Export airdrop CSV
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <Avatar className="size-12">
              {hub.data.logoUrl ? <AvatarImage src={hub.data.logoUrl} alt={hub.data.name} /> : null}
              <AvatarFallback className="bg-slate-900 text-white">
                {hub.data.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl">{hub.data.name}</CardTitle>
              <CardDescription className="mt-1">
                {hub.data.description ?? "Community asset hub"}
              </CardDescription>
              {linkItems.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {linkItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {item.label}
                      <ExternalLink className="size-3" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">{hub.data.stats.templatesCount}</span>{" "}
                templates
              </div>
              <div>
                <span className="font-medium text-foreground">{hub.data.stats.remixCount}</span>{" "}
                remixes
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Asset hub</h2>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={category === option.value ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setCategory(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {templates.isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader className="size-6 text-muted-foreground animate-spin" />
              </div>
            ) : templates.isError ? (
              <div className="rounded-lg border p-4 flex items-start gap-3">
                <TriangleAlert className="mt-0.5 size-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Failed to load templates</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {templates.error?.message ?? "Unknown error"}
                  </div>
                </div>
              </div>
            ) : templateRows.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                No templates in this category yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {templateRows.map((template) => (
                  <TemplateCard
                    key={template.id}
                    title={template.name}
                    imageSrc={template.thumbnailUrl || ""}
                    onClick={() => onClickTemplate(template)}
                    disabled={remix.isPending || Boolean(transitioning)}
                    description={`${template.width} x ${template.height} px`}
                    width={template.width}
                    height={template.height}
                    isPro={template.isPro}
                    hasToken={Boolean(template.token?.printrTokenId)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leaderboards</CardTitle>
                <CardDescription>Top contributors and templates (by remix).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Top contributors</div>
                  {leaderboards.isLoading ? (
                    <div className="flex items-center justify-center h-16">
                      <Loader className="size-5 text-muted-foreground animate-spin" />
                    </div>
                  ) : topContributors.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No data yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {topContributors.slice(0, 8).map((row) => (
                        <div key={row.userId} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-7">
                              {row.image ? <AvatarImage src={row.image} alt={row.name ?? row.userId} /> : null}
                              <AvatarFallback className="bg-slate-900 text-white text-[10px]">
                                {(row.name ?? "U").slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-sm truncate">
                              {row.name ?? "Anonymous"}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {row.remixCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Top templates</div>
                  {leaderboards.isLoading ? (
                    <div className="flex items-center justify-center h-16">
                      <Loader className="size-5 text-muted-foreground animate-spin" />
                    </div>
                  ) : topTemplates.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No data yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {topTemplates.slice(0, 6).map((row) => (
                        <div key={row.templateId} className="flex items-center justify-between gap-3">
                          <div className="text-sm truncate">{row.name}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {row.remixCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity</CardTitle>
                <CardDescription>Recent template remixes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activity.isLoading ? (
                  <div className="flex items-center justify-center h-16">
                    <Loader className="size-5 text-muted-foreground animate-spin" />
                  </div>
                ) : activityRows.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No activity yet.</div>
                ) : (
                  <div className="space-y-3">
                    {activityRows.map((event) => (
                      <div key={event.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm truncate">
                            <span className="font-medium">
                              {event.user.name ?? "Anonymous"}
                            </span>{" "}
                            remixed{" "}
                            <span className="font-medium">{event.template.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNowStrict(new Date(event.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rewards</CardTitle>
            <CardDescription>
              Eligibility, proofs, and reward distribution are coming soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            For now, you can export a CSV of the current leaderboard and use it for off-chain rewards or allowlists.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
