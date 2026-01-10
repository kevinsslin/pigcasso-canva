"use client";

import Link from "next/link";
import { Loader, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import { useGetGlobalLeaderboards } from "@/features/leaderboards/api/use-get-global-leaderboards";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type GlobalLeaderboardsPanelProps = {
  enabled?: boolean;
  className?: string;
};

export const GlobalLeaderboardsPanel = ({
  enabled = true,
  className,
}: GlobalLeaderboardsPanelProps) => {
  const leaderboards = useGetGlobalLeaderboards(
    { limit: "20" },
    { enabled },
  );

  if (!enabled) return null;

  if (leaderboards.isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (leaderboards.isError) {
    return (
      <div className="rounded-lg border p-4 flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="font-medium">Failed to load leaderboards</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {leaderboards.error?.message ?? "Unknown error"}
          </div>
        </div>
      </div>
    );
  }

  const data = leaderboards.data ?? {
    topProjects: [],
    topCreators: [],
    topTemplates: [],
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Projects</CardTitle>
          <CardDescription>Ranked by template remixes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topProjects.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <div className="space-y-3">
              {data.topProjects.map((row) => (
                <Link
                  key={row.id}
                  href={`/projects/${row.slug}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-8">
                      {row.logoUrl ? <AvatarImage src={row.logoUrl} alt={row.name} /> : null}
                      <AvatarFallback className="bg-slate-900 text-white text-[10px]">
                        {row.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.templatesCount} templates
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {row.remixCount} remixes
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Creators</CardTitle>
          <CardDescription>Ranked by remixes created.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topCreators.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <div className="space-y-3">
              {data.topCreators.map((row) => (
                <div
                  key={row.userId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-8">
                      {row.image ? <AvatarImage src={row.image} alt={row.name ?? row.userId} /> : null}
                      <AvatarFallback className="bg-slate-900 text-white text-[10px]">
                        {(row.name ?? "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm font-medium truncate">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Templates</CardTitle>
          <CardDescription>Most remixed templates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topTemplates.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data yet.</div>
          ) : (
            <div className="space-y-3">
              {data.topTemplates.map((row) => (
                <div key={row.templateId} className="rounded-md border px-3 py-2 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{row.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {row.remixCount} remixes
                      </div>
                    </div>
                    <Link
                      href={`/templates/${row.templateId}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      View
                    </Link>
                  </div>
                  <Separator />
                  <Link
                    href={`/projects/${row.projectHubSlug}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Project: {row.projectHubName}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

