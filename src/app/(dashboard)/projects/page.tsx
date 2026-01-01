"use client";

import Link from "next/link";
import { Loader, TriangleAlert } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGetProjectHubs } from "@/features/project-hubs/api/use-get-project-hubs";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectsPage() {
  const { ready, authenticated } = useRequireAuth("/projects");
  const hubs = useGetProjectHubs({ page: "1", limit: "24" });

  if (!ready || !authenticated || hubs.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (hubs.isError) {
    return (
      <div className="max-w-screen-xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Explore community projects and their asset hubs.
          </p>
        </div>
        <div className="rounded-lg border p-4 flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Failed to load projects</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {hubs.error?.message ?? "Unknown error"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const data = hubs.data?.data ?? [];

  return (
    <div className="max-w-screen-xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Explore community projects and their asset hubs.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((hub) => (
            <Link key={hub.id} href={`/projects/${hub.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar className="size-10">
                    {hub.logoUrl ? <AvatarImage src={hub.logoUrl} alt={hub.name} /> : null}
                    <AvatarFallback className="bg-slate-900 text-white">
                      {hub.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{hub.name}</CardTitle>
                    <div className="text-xs text-muted-foreground truncate">
                      {hub.description ?? "Community asset hub"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-6 text-xs text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground">
                      {hub.stats.templatesCount}
                    </div>
                    <div>Templates</div>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {hub.stats.remixCount}
                    </div>
                    <div>Remixes</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

