"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Github, Loader2, Search, Unplug } from "lucide-react";
import { useOAuthTokens, usePrivy } from "@privy-io/react-auth";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGithubConnection } from "@/features/repositories/api/use-github-connection";
import { useGithubRepos } from "@/features/repositories/api/use-github-repos";
import { useConnectGithub } from "@/features/repositories/api/use-connect-github";
import { useDisconnectGithub } from "@/features/repositories/api/use-disconnect-github";
import { RepoCard } from "@/features/repositories/components/repo-card";
import { RepoAssetDialog } from "@/features/repositories/components/repo-asset-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [selectedFullName, setSelectedFullName] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const privyGithubUsername = user?.github?.username ?? null;
  const githubLinked = Boolean(user?.github?.subject);
  const githubConnected = connection.data?.connected ?? false;

  const visibleRepos = useMemo(() => {
    const list = repos.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((repo) => {
      const haystack = `${repo.fullName} ${repo.description ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, repos.data]);

  const selectedRepo = useMemo(() => {
    if (!selectedFullName) return null;
    return (repos.data ?? []).find((repo) => repo.fullName === selectedFullName) ?? null;
  }, [repos.data, selectedFullName]);

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
        mode="dashboard"
        repo={selectedRepo}
        onNavigateToEditor={({ projectId, assetUrl }) => {
          router.push(`/editor/${projectId}?asset=${encodeURIComponent(assetUrl)}`);
        }}
      />

      <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">Repository → Asset</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect GitHub, pick a repo, and generate a meme avatar from code context.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {githubConnected ? (
            <Button
              variant="secondary"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              <Unplug className="size-4 mr-2" />
              Disconnect
            </Button>
          ) : githubLinked ? (
            <Button
              onClick={() => oauth.reauthorize({ provider: "github" })}
              disabled={connectMutation.isPending}
            >
              <Github className="size-4 mr-2" />
              Authorize GitHub
            </Button>
          ) : (
            <Button onClick={() => linkGithub()} disabled={connectMutation.isPending}>
              <Github className="size-4 mr-2" />
              Link GitHub
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 flex flex-col gap-2">
        <div className="text-sm font-medium">Connection</div>
        <div className="text-sm text-muted-foreground">
          {githubConnected ? (
            <>Connected{connection.data?.username ? ` as ${connection.data.username}` : ""}.</>
          ) : githubLinked ? (
            <>
              GitHub linked{privyGithubUsername ? ` as ${privyGithubUsername}` : ""}, but not
              authorized for repo access yet.
            </>
          ) : (
            "Not connected."
          )}
        </div>
        {!githubConnected ? (
          <div className="text-xs text-muted-foreground">
            Enable GitHub in Privy dashboard login methods, then link/authorize here.
          </div>
        ) : null}
      </div>

      {githubConnected ? (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories…"
              className="pl-9"
            />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleRepos.map((repo) => (
              <RepoCard
                key={repo.fullName}
                repo={repo}
                disabled={connectMutation.isPending || disconnectMutation.isPending}
                onOpenAsset={() => {
                  setSelectedFullName(repo.fullName);
                  setDialogOpen(true);
                }}
              />
            ))}
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
