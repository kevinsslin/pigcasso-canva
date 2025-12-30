"use client";

import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  open: boolean;
  title?: string;
  description?: string;
}

export const LoadingOverlay = ({
  open,
  title = "Loading…",
  description,
}: LoadingOverlayProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[min(92vw,420px)] rounded-2xl border bg-white/95 shadow-xl px-6 py-5">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <div className="font-semibold">{title}</div>
        </div>
        {description ? (
          <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
    </div>
  );
};

