"use client";

import { useState } from "react";
import { Check, Globe, Link2, Loader2, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getPublishedCanvasShareUrl } from "@/features/canvases/utils/canvas-share";
import { usePublishCanvas } from "@/features/canvases/api/use-publish-canvas";

export const CanvasPublishButton = ({
  canvasId,
  isPublished,
  disabled,
  className,
}: {
  canvasId: string;
  isPublished: boolean;
  disabled?: boolean;
  className?: string;
}) => {
  const publishMutation = usePublishCanvas({ toast: false });
  const [copying, setCopying] = useState(false);

  const copyLink = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const url = getPublishedCanvasShareUrl(canvasId);
      const ok = await copyTextToClipboard(url);
      toast.message(ok ? "Public link copied." : "Failed to copy link.");
    } finally {
      setCopying(false);
    }
  };

  const publish = async () => {
    const toastId = "pigcasso:publish";
    toast.loading("Publishing…", { id: toastId, duration: Infinity });
    try {
      await publishMutation.mutateAsync({
        param: { id: canvasId },
        json: { isPublished: true },
      });
      toast.success("Published.", { id: toastId });
      await copyLink();
    } catch (error) {
      toast.error((error as Error).message || "Failed to publish.", { id: toastId });
    }
  };

  const unpublish = async () => {
    const toastId = "pigcasso:unpublish";
    toast.loading("Unpublishing…", { id: toastId, duration: Infinity });
    try {
      await publishMutation.mutateAsync({
        param: { id: canvasId },
        json: { isPublished: false },
      });
      toast.success("Unpublished.", { id: toastId });
    } catch (error) {
      toast.error((error as Error).message || "Failed to unpublish.", { id: toastId });
    }
  };

  const busy = publishMutation.isPending || copying;

  if (!isPublished) {
    return (
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => void publish()}
        disabled={disabled || busy}
      >
        {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Globe className="size-4 mr-2" />}
        Publish
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className={className}
          disabled={disabled || busy}
        >
          {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Check className="size-4 mr-2" />}
          Published
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => void copyLink()} disabled={busy}>
          <Link2 className="size-4 mr-2" />
          Copy public link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void unpublish()} disabled={busy}>
          <EyeOff className="size-4 mr-2" />
          Unpublish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

