"use client";

import { ExternalLink, Loader2, Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

import type { SpaceDocument } from "@/features/spaces/lib/space-document";
import { BentoSpacePage } from "@/features/spaces/components/space-public/bento-space-page";

type SpacePublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: SpaceDocument;
  handle: string;
  walletLabel: string | null;
  spacePath: string | null;
  isPublished: boolean;
  hasLiveChanges: boolean;
  isPublishing?: boolean;
  onConfirm: () => void;
};

export const SpacePublishDialog = ({
  open,
  onOpenChange,
  document,
  handle,
  walletLabel,
  spacePath,
  isPublished,
  hasLiveChanges,
  isPublishing,
  onConfirm,
}: SpacePublishDialogProps) => {
  const isUpToDate = isPublished && !hasLiveChanges;
  const closeLabel = isUpToDate ? "Close" : "Keep editing";
  const statusLabel = !isPublished
    ? "Not published yet."
    : hasLiveChanges
      ? "Draft changes not live."
      : "Live is up to date.";
  const statusClass = !isPublished
    ? "text-muted-foreground"
    : hasLiveChanges
      ? "text-amber-700"
      : "text-emerald-700";
  const confirmLabel = isPublishing
    ? isPublished
      ? "Updating…"
      : "Publishing…"
    : isUpToDate
      ? "Up to date"
      : isPublished
        ? "Update live"
        : "Publish";

  const isConfirmDisabled = Boolean(isPublishing || isUpToDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden rounded-3xl">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-white/60 bg-white/80 px-6 py-5 text-left backdrop-blur">
            <DialogTitle className="text-xl font-extrabold tracking-tight text-gray-900">
              Preview your Space
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Confirm before publishing. This preview should match the live page.
            </DialogDescription>
            {spacePath ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700 shadow-soft">
                  {spacePath}
                </div>
                {isPublished ? (
                  <Button asChild type="button" variant="secondary" size="sm">
                    <a href={spacePath} target="_blank" rel="noreferrer">
                      Open live <ExternalLink className="ml-2 size-4" />
                    </a>
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">Publish to enable your public Space.</div>
                )}
                <div className={cn("text-xs font-semibold", statusClass)}>{statusLabel}</div>
              </div>
            ) : null}
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto bg-background">
            <BentoSpacePage handle={handle} walletLabel={walletLabel} document={document} />
          </div>

          <DialogFooter className="shrink-0 border-t border-white/60 bg-white/80 px-6 py-5 backdrop-blur sm:justify-between">
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              {closeLabel}
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className="rounded-2xl bg-primary text-white shadow-glow hover:opacity-95"
            >
              {isPublishing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 size-4" />
              )}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
