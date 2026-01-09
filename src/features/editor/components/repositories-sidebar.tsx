import { useMemo, useState } from "react";
import { Github, Loader2, Search, Unplug } from "lucide-react";
import { useOAuthTokens, usePrivy } from "@privy-io/react-auth";

import type { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { RepoAssetDialog } from "@/features/repositories/components/repo-asset-dialog";
import { RepoCard } from "@/features/repositories/components/repo-card";
import { useConnectGithub } from "@/features/repositories/api/use-connect-github";
import { useDisconnectGithub } from "@/features/repositories/api/use-disconnect-github";
import { useGithubConnection } from "@/features/repositories/api/use-github-connection";
import { useGithubRepos } from "@/features/repositories/api/use-github-repos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type RepositoriesSidebarProps = {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const RepositoriesSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: RepositoriesSidebarProps) => {
  const { ready, authenticated, user, linkGithub } = usePrivy();

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

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-card/80 backdrop-blur relative border-r border-border/60 z-[40] w-[360px] h-full flex flex-col",
        activeTool === "repositories" ? "visible" : "hidden",
      )}
    >
      <RepoAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="editor"
        editor={editor}
        repo={selectedRepo}
      />

      <ToolSidebarHeader
        title="Repositories"
        description="Repository → Asset: generate meme avatars from code."
      />

      <div className="p-4 border-b border-border/60 space-y-3">
        <div className="flex items-center gap-2">
          {githubConnected ? (
            <Button
              variant="secondary"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="flex-1"
            >
              <Unplug className="size-4 mr-2" />
              Disconnect
            </Button>
          ) : githubLinked ? (
            <Button
              onClick={() => oauth.reauthorize({ provider: "github" })}
              disabled={connectMutation.isPending}
              className="flex-1"
            >
              <Github className="size-4 mr-2" />
              Authorize GitHub
            </Button>
          ) : (
            <Button onClick={() => linkGithub()} disabled={connectMutation.isPending} className="flex-1">
              <Github className="size-4 mr-2" />
              Link GitHub
            </Button>
          )}

          {githubConnected ? (
            <Button
              variant="secondary"
              onClick={() => repos.refetch()}
              disabled={repos.isFetching}
              size="icon"
              aria-label="Refresh repositories"
            >
              {repos.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Loader2 className="size-4" />
              )}
            </Button>
          ) : null}
        </div>

        {githubConnected ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories…"
              className="pl-9"
            />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Connect GitHub to browse repos and generate assets.
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {githubConnected ? (
            repos.isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="size-6 text-muted-foreground animate-spin" />
              </div>
            ) : repos.isError ? (
              <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                {repos.error.message || "Failed to load repositories."}
              </div>
            ) : visibleRepos.length ? (
              <div className="grid grid-cols-1 gap-4">
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
              <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                No repositories found.
              </div>
            )
          ) : (
            <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
              Link + authorize GitHub to see repos here.
            </div>
          )}
        </div>
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
