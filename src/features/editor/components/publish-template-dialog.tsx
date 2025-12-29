"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { fabric } from "fabric";

import { client } from "@/lib/hono";
import { getAuthToken } from "@/lib/auth-token";
import { uploadFiles } from "@/lib/uploadthing";
import { usePro } from "@/features/auth/hooks/use-pro";
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

type PublishTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | undefined;
  projectId: string;
  projectName: string;
};

const THUMBNAIL_MULTIPLIER = 0.35;

const buildShareUrl = (path: string) => {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
};

const makeThumbnailDataUrl = (editor: Editor) => {
  const workspace = editor.getWorkspace() as fabric.Rect | undefined;
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const canvas = editor.canvas;
  const previousViewport = canvas.viewportTransform?.slice() ?? [
    1, 0, 0, 1, 0, 0,
  ];

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: "png",
    quality: 1,
    width: workspace.getScaledWidth(),
    height: workspace.getScaledHeight(),
    left: workspace.left ?? 0,
    top: workspace.top ?? 0,
    multiplier: THUMBNAIL_MULTIPLIER,
  });

  canvas.setViewportTransform(previousViewport);
  canvas.renderAll();

  return dataUrl;
};

export const PublishTemplateDialog = ({
  open,
  onOpenChange,
  editor,
  projectId,
  projectName,
}: PublishTemplateDialogProps) => {
  const { isPro } = usePro();
  const [proOnly, setProOnly] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const sharePath = useMemo(() => `/templates/${projectId}`, [projectId]);

  const onPublish = async () => {
    if (!editor) {
      toast.error("Editor not ready yet.");
      return;
    }

    setPublishing(true);
    try {
      const dataUrl = makeThumbnailDataUrl(editor);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `thumbnail_${projectId}.png`, {
        type: "image/png",
      });

      const token = await getAuthToken();
      if (!token) {
        toast.error("Missing auth token. Please sign in again.");
        return;
      }

      const uploaded = await uploadFiles("imageUploader", {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
      });

      const thumbnailUrl = uploaded?.[0]?.url;
      if (!thumbnailUrl) {
        throw new Error("Failed to upload thumbnail");
      }

      const response = await client.api.projects[":id"]["publish-template"].$post({
        param: { id: projectId },
        json: {
          thumbnailUrl,
          isPro: proOnly,
        },
      });

      if (!response.ok) {
        const message =
          response.status === 403
            ? "Pro required to publish a Pro-only template."
            : "Failed to publish template.";
        throw new Error(message);
      }

      const json = await response.json();
      const url = buildShareUrl(json.sharePath ?? sharePath);

      try {
        await navigator.clipboard.writeText(url);
        toast.success("Published. Share link copied.");
      } catch {
        toast.success("Published.");
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish template.",
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish as Template</DialogTitle>
          <DialogDescription>
            Generates a thumbnail and creates a share link for remixing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium">{projectName}</div>
            <div className="text-xs text-muted-foreground">{sharePath}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={proOnly ? "default" : "secondary"}
              onClick={() => setProOnly((v) => !v)}
              disabled={!isPro || publishing}
            >
              {proOnly ? "Pro-only" : "Free template"}
            </Button>
            <div className="text-xs text-muted-foreground">
              {isPro
                ? "Toggle whether remix requires Pro."
                : "Unlock Pro to publish Pro-only templates."}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={publishing}
          >
            Cancel
          </Button>
          <Button onClick={onPublish} disabled={publishing}>
            {publishing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

