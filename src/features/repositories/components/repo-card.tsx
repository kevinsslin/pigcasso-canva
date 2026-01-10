"use client";

import { ExternalLink, GitFork, Lock, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Repo = {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  private: boolean;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  owner: {
    login: string;
    avatarUrl: string | null;
  };
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export const RepoCard = (props: {
  repo: Repo;
  disabled?: boolean;
  onOpenAsset: () => void;
}) => {
  const { repo, disabled, onOpenAsset } = props;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{repo.name}</CardTitle>
            {repo.description ? (
              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {repo.description}
              </div>
            ) : null}
          </div>
          <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <Button size="icon" variant="ghost" type="button">
              <ExternalLink className="size-4" />
            </Button>
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {repo.private ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              <Lock className="size-3" />
              Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              Public
            </span>
          )}
          {repo.language ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              {repo.language}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <Star className="size-3" />
            {repo.stargazersCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
            <GitFork className="size-3" />
            {repo.forksCount}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Updated {formatDate(repo.updatedAt)}
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={disabled}
          onClick={onOpenAsset}
        >
          <Sparkles className="size-4 mr-2" />
          Repository → Asset
        </Button>
      </CardContent>
    </Card>
  );
};
