"use client";

import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { useGenerateRepoAsset } from "@/features/repositories/api/use-generate-repo-asset";
import { useCreateProject } from "@/features/projects/api/use-create-project";

import { uploadFiles } from "@/lib/uploadthing";
import { getAuthToken } from "@/lib/auth-token";
import { client } from "@/lib/hono";
import type { Editor } from "@/features/editor/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Repo = {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  owner: {
    login: string;
    avatarUrl: string | null;
  };
};

const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
};

const uploadImageDataUrl = async (dataUrl: string, fileName: string) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Missing auth token. Please sign in again.");
  }

  const file = await dataUrlToFile(dataUrl, fileName);

  const uploaded = await uploadFiles("imageUploader", {
    files: [file],
    headers: { Authorization: `Bearer ${token}` },
  });

  const url = uploaded?.[0]?.url;
  if (!url) {
    throw new Error("Failed to upload image");
  }

  return url;
};

export const RepoAssetDialog = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repo: Repo | null;
} & (
  | {
      mode: "dashboard";
      onNavigateToEditor: (options: { projectId: string; assetUrl: string }) => void;
    }
  | {
      mode: "editor";
      editor: Editor | undefined;
    }
)) => {
  const { open, onOpenChange, repo } = props;

  const generateMutation = useGenerateRepoAsset();
  const createProjectMutation = useCreateProject();

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const repoLabel = useMemo(() => repo?.fullName ?? "Repository", [repo?.fullName]);

  const ensureGenerated = useCallback(async () => {
    if (!repo) {
      throw new Error("Missing repository");
    }
    if (imageDataUrl) {
      return imageDataUrl;
    }

    const result = await generateMutation.mutateAsync({
      owner: repo.owner.login,
      repo: repo.name,
    });

    const next = result.data.imageUrl;
    setImageDataUrl(next);
    return next;
  }, [generateMutation, imageDataUrl, repo]);

  const onGenerate = useCallback(async () => {
    if (!repo) return;
    setBusy(true);
    try {
      const result = await generateMutation.mutateAsync({
        owner: repo.owner.login,
        repo: repo.name,
      });
      setImageDataUrl(result.data.imageUrl);
      toast.success("Asset generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate asset");
    } finally {
      setBusy(false);
    }
  }, [generateMutation, repo]);

  const onCreateProject = useCallback(async () => {
    if (!repo) return;

    if (props.mode !== "dashboard") {
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await ensureGenerated();
      const uploadedUrl = await uploadImageDataUrl(
        dataUrl,
        `repo_asset_${repo.owner.login}_${repo.name}.png`,
      );

      const created = await createProjectMutation.mutateAsync({
        name: `Repo Asset: ${repo.fullName}`,
        json: "",
        width: 1024,
        height: 1024,
      });

      onOpenChange(false);
      props.onNavigateToEditor({ projectId: created.data.id, assetUrl: uploadedUrl });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setBusy(false);
    }
  }, [createProjectMutation, ensureGenerated, onOpenChange, props, repo]);

  const onAddToCanvas = useCallback(async () => {
    if (!repo) return;
    if (props.mode !== "editor") {
      return;
    }

    if (!props.editor) {
      toast.error("Editor not ready yet.");
      return;
    }

    setBusy(true);
    try {
      const dataUrl = await ensureGenerated();
      props.editor.addImage(dataUrl);
      toast.success("Added to canvas.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to canvas");
    } finally {
      setBusy(false);
    }
  }, [ensureGenerated, onOpenChange, props, repo]);

  const onPublishToPrintr = useCallback(async () => {
    if (!repo) return;

    setBusy(true);
    try {
      const dataUrl = await ensureGenerated();
      const uploadedUrl = await uploadImageDataUrl(
        dataUrl,
        `repo_asset_${repo.owner.login}_${repo.name}.png`,
      );

      const response = await client.api.printr.publish.$post({
        json: {
          name: repo.fullName,
          imageUrl: uploadedUrl,
          sourceRepoUrl: repo.htmlUrl,
        },
      });

      if (!response.ok) {
        let message = "Failed to publish to Printr";
        try {
          const body = await response.json();
          if (
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof (body as any).error === "string"
          ) {
            message = (body as any).error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const json = await response.json();
      const message =
        json &&
        typeof json === "object" &&
        "data" in json &&
        (json as any).data &&
        typeof (json as any).data === "object" &&
        "message" in (json as any).data &&
        typeof (json as any).data.message === "string"
          ? (json as any).data.message
          : "Published to Printr.";
      toast.success(message);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish to Printr");
    } finally {
      setBusy(false);
    }
  }, [ensureGenerated, onOpenChange, repo]);

  if (!repo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repository → Asset</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Select a repository to generate an asset.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setImageDataUrl(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Repository → Asset</DialogTitle>
          <DialogDescription>
            Generate a meme avatar inspired by <span className="font-medium">{repoLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{repo.fullName}</div>
              {repo.description ? (
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {repo.description}
                </div>
              ) : null}
            </div>
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              <Button variant="secondary" size="sm" type="button">
                <ExternalLink className="size-4 mr-2" />
                GitHub
              </Button>
            </a>
          </div>

          <div className="rounded-xl border bg-muted overflow-hidden">
            {imageDataUrl ? (
              <div className="relative aspect-square w-full">
                <Image
                  src={imageDataUrl}
                  alt={repo.fullName}
                  fill
                  unoptimized
                  sizes="480px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="aspect-square flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                {busy ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    No preview yet
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Close
          </Button>
          <Button type="button" variant="secondary" onClick={onGenerate} disabled={busy}>
            {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
            Regenerate
          </Button>
          <Button type="button" variant="secondary" onClick={onPublishToPrintr} disabled={busy}>
            Publish to Printr
          </Button>
          {props.mode === "dashboard" ? (
            <Button type="button" onClick={onCreateProject} disabled={busy}>
              Open in editor
            </Button>
          ) : (
            <Button type="button" onClick={onAddToCanvas} disabled={busy}>
              Add to canvas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
