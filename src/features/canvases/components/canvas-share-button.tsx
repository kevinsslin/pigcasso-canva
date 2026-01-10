"use client";

import { useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/clipboard";

import { Button } from "@/components/ui/button";

import { getCanvasShareUrl } from "@/features/canvases/utils/canvas-share";

export const CanvasShareButton = ({
  canvasId,
  className,
  compact = false,
}: {
  canvasId: string;
  className?: string;
  compact?: boolean;
}) => {
  const [copying, setCopying] = useState(false);

  const onShare = async () => {
    if (copying) return;

    setCopying(true);
    try {
      const url = getCanvasShareUrl(canvasId);
      const ok = await copyTextToClipboard(url);
      if (ok) {
        toast.success("Link copied.");
      } else {
        toast.error("Failed to copy link.");
      }
    } finally {
      setCopying(false);
    }
  };

  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "secondary"}
      size={compact ? "icon" : "default"}
      className={cn("rounded-full", className)}
      onClick={() => void onShare()}
      disabled={copying}
      aria-label="Share"
    >
      {copying ? (
        <Loader2 className={cn("size-4 animate-spin", compact ? undefined : "mr-2")} />
      ) : (
        <Share2 className={cn("size-4", compact ? undefined : "mr-2")} />
      )}
      {compact ? null : "Share"}
    </Button>
  );
};
