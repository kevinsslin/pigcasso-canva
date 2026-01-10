"use client";

import { useOAuthTokens, usePrivy } from "@privy-io/react-auth";
import { Github, Loader2, Search, Unplug } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGithubConnection } from "@/features/repositories/api/use-github-connection";
import { useGithubRepos } from "@/features/repositories/api/use-github-repos";
import { useConnectGithub } from "@/features/repositories/api/use-connect-github";
import { useDisconnectGithub } from "@/features/repositories/api/use-disconnect-github";
import { RepoCard } from "@/features/repositories/components/repo-card";
import { RepoAssetDialog } from "@/features/repositories/components/repo-asset-dialog";
import { groupReposByOwner } from "@/features/repositories/lib/repo-grouping";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type VisibilityFilter = "all" | "public" | "private";
type SortKey = "updated" | "stars" | "name";

const getVisibilityLabel = (value: VisibilityFilter) => {
  switch (value) {
    case "public":
      return "Public";
    case "private":
      return "Private";
    default:
      return "All";
  }
};

const getSortLabel = (value: SortKey) => {
  switch (value) {
    case "stars":
      return "Stars";
    case "name":
      return "Name";
    default:
      return "Updated";
  }
};

const sortRepos = <TRepo extends { fullName: string; updatedAt: string; stargazersCount: number }>(
  repos: TRepo[],
  key: SortKey,
) => {
  const list = [...repos];

  const byUpdated = (a: TRepo, b: TRepo) => {
    const ta = Date.parse(a.updatedAt);
    const tb = Date.parse(b.updatedAt);
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0;
    return tb - ta;
  };

  if (key === "stars") {
    list.sort((a, b) => b.stargazersCount - a.stargazersCount || byUpdated(a, b));
    return list;
  }

  if (key === "name") {
    list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return list;
  }

  list.sort(byUpdated);
  return list;
};

export default function RepositoriesPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth("/repositories");
  const { user, linkGithub } = usePrivy();

  const connectMutation = useConnectGithub();
  const disconnectMutation = useDisconnectGithub();

  const oauth = useOAuthTokens({
    onOAuthTokenGrant: ({ oAuthTokens }) => {
      if (oAuthTokens.provider !== "github") {
        return;
      }
      connectMutation.mutate({
        accessToken: oAuthTokens.accessToken,
        refreshToken: oAuthTokens.refreshToken,
        scopes: oAuthTokens.scopes,
      });
    },
  });

  const connection = useGithubConnection({ enabled: ready && authenticated });
  const repos = useGithubRepos({
    enabled: ready && authenticated && connection.data?.connected === true,
  });

  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const privyGithubUsername = user?.github?.username ?? null;
  const githubLinked = Boolean(user?.github?.subject);
  const githubConnected = connection.data?.connected ?? false;

  const visibleRepos = useMemo(() => {
    const list = repos.data ?? [];
    const filtered =
      visibility === "private"
        ? list.filter((repo) => repo.private)
        : visibility === "public"
          ? list.filter((repo) => !repo.private)
          : list;

    const q = query.trim().toLowerCase();
    const searched = !q
      ? filtered
      : filtered.filter((repo) => {
          const haystack = `${repo.fullName} ${repo.description ?? ""}`.toLowerCase();
          return haystack.includes(q);
        });

    return sortRepos(searched, sort);
  }, [query, repos.data, sort, visibility]);

  const repoGroups = useMemo(() => {
    const personalLogin = connection.data?.username ?? privyGithubUsername;
    return groupReposByOwner(visibleRepos, { personalLogin });
  }, [connection.data?.username, privyGithubUsername, visibleRepos]);

  const selectedRepo = useMemo(() => {
    if (!selectedFullName) return null;
    return (repos.data ?? []).find((repo) => repo.fullName === selectedFullName) ?? null;
  }, [repos.data, selectedFullName]);

  const actionsDisabled = connectMutation.isPending || disconnectMutation.isPending;

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10">
      <RepoAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        repo={selectedRepo}
        onNavigateToCanvas={({ canvasId, imageUrl }) => {
          router.push(`/canvas/${canvasId}?image=${encodeURIComponent(imageUrl)}`);
        }}
      />

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Repository → Asset</h1>
        <p className="text-sm text-muted-foreground">
          Connect GitHub, pick a repo, and generate a meme avatar from code context.
        </p>
      </div>

      <Card className="bg-card/80 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Github className="size-4 text-muted-foreground" />
            GitHub connection
          </CardTitle>
          <CardDescription>
            Link + authorize GitHub so we can list your repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {connection.isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Checking connection…
                </span>
              ) : connection.isError ? (
                <span className="text-destructive">
                  {connection.error.message || "Failed to load connection status."}
                </span>
              ) : githubConnected ? (
                <>Connected{connection.data?.username ? ` as ${connection.data.username}` : ""}.</>
              ) : githubLinked ? (
                <>
                  Linked{privyGithubUsername ? ` as ${privyGithubUsername}` : ""} — authorize to
                  fetch repositories.
                </>
              ) : (
                "Not connected."
              )}
            </div>

            <div className="flex items-center gap-2">
              {githubConnected ? (
                <Button
                  variant="secondary"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={actionsDisabled}
                >
                  <Unplug className="size-4 mr-2" />
                  Disconnect
                </Button>
              ) : githubLinked ? (
                <Button
                  onClick={() => oauth.reauthorize({ provider: "github" })}
                  disabled={connectMutation.isPending || connection.isLoading}
                >
                  <Github className="size-4 mr-2" />
                  Authorize GitHub
                </Button>
              ) : (
                <Button
                  onClick={() => linkGithub()}
                  disabled={connectMutation.isPending || connection.isLoading}
                >
                  <Github className="size-4 mr-2" />
                  Link GitHub
                </Button>
              )}
            </div>
          </div>

          {!githubConnected ? (
            <div className="text-xs text-muted-foreground">
              Tip: enable GitHub in Privy → Login methods, then link/authorize here. If you just
              changed scopes, disconnect and re-authorize.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {githubConnected ? (
        <Card className="bg-card/80 backdrop-blur">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search repositories…"
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full border bg-background p-1">
                  {(["all", "public", "private"] as const).map((key) => {
                    const active = visibility === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setVisibility(key)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        )}
                        aria-pressed={active}
                      >
                        {getVisibilityLabel(key)}
                      </button>
                    );
                  })}
                </div>

                <div className="inline-flex items-center gap-1 rounded-full border bg-background p-1">
                  {(["updated", "stars", "name"] as const).map((key) => {
                    const active = sort === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSort(key)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          active
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        )}
                        aria-pressed={active}
                      >
                        {getSortLabel(key)}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="secondary"
                  onClick={() => repos.refetch()}
                  disabled={repos.isFetching}
                >
                  {repos.isFetching ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                  Refresh
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{visibleRepos.length}</span>{" "}
              of <span className="font-medium text-foreground">{repos.data?.length ?? 0}</span>{" "}
              repositories.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {githubConnected ? (
        repos.isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : repos.isError ? (
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 text-sm">
            {repos.error.message || "Failed to load repositories."}
          </div>
        ) : visibleRepos.length ? (
          <div className="space-y-6">
            {repoGroups.map((group) => {
              const privateCount = group.repos.filter((repo) => repo.private).length;
              const title = group.isPersonal ? `You (@${group.ownerLogin})` : `@${group.ownerLogin}`;

              return (
                <section key={group.ownerLogin} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9">
                        {group.ownerAvatarUrl ? (
                          <AvatarImage src={group.ownerAvatarUrl} alt={group.ownerLogin} />
                        ) : null}
                        <AvatarFallback className="text-xs font-semibold">
                          {group.ownerLogin.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{title}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.repos.length} repos
                          {privateCount ? ` · ${privateCount} private` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.repos.map((repo) => (
                      <RepoCard
                        key={repo.fullName}
                        repo={repo}
                        disabled={actionsDisabled}
                        onOpenAsset={() => {
                          setSelectedFullName(repo.fullName);
                          setDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 text-sm text-muted-foreground">
            No repositories found.
          </div>
        )
      ) : (
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-6 text-sm text-muted-foreground">
          Connect GitHub to see your repositories here.
        </div>
      )}
    </div>
  );
}
