import Link from "next/link";
import { ArrowLeft, ExternalLink, Eye, GripVertical, LayoutGrid, Rocket, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { SpaceBuilderMode } from "@/features/spaces/hooks/use-space-builder";
import { CopySpaceLink } from "@/features/spaces/components/copy-space-link";

type SpaceBuilderHeaderProps = {
  mode: SpaceBuilderMode;
  onModeChange: (mode: SpaceBuilderMode) => void;
  onPublish: () => void;
  publishDisabled: boolean;
  saveStatus: "saving" | "dirty" | "saved";
  isPublished: boolean;
  hasLiveChanges: boolean;
  spacePath: string | null;
  modulesOpen: boolean;
  inspectorOpen: boolean;
  onToggleModules: () => void;
  onToggleInspector: () => void;
};

export const SpaceBuilderHeader = ({
  mode,
  onModeChange,
  onPublish,
  publishDisabled,
  saveStatus,
  isPublished,
  hasLiveChanges,
  spacePath,
  modulesOpen,
  inspectorOpen,
  onToggleModules,
  onToggleInspector,
}: SpaceBuilderHeaderProps) => {
  const savingLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "dirty"
        ? "Unsaved"
        : "Saved";

  const savingDotClass =
    saveStatus === "saving"
      ? "bg-yellow-400"
      : saveStatus === "dirty"
        ? "bg-red-400"
        : "bg-emerald-400";

  const liveStatusLabel = !isPublished
    ? "Draft"
    : hasLiveChanges
      ? "Changes not live"
      : "Live";

  const liveStatusClass = !isPublished
    ? "border-white/70 bg-white/70 text-gray-700"
    : hasLiveChanges
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  const publishLabel = !isPublished
    ? "Publish"
    : hasLiveChanges
      ? "Update live"
      : "Up to date";

  const publishIsDisabled = publishDisabled || (isPublished && !hasLiveChanges);
  const publishTooltip = publishDisabled
    ? "Finishing save…"
    : isPublished && !hasLiveChanges
      ? "No draft changes to publish."
      : null;

  return (
    <header className="shrink-0 z-30 border-b border-white/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center overflow-hidden shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-pig.png" alt="Pigcasso" className="h-9 w-9 object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold tracking-tight text-gray-900">
              Pigcasso Space Builder
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold shadow-sm",
                  liveStatusClass,
                )}
              >
                {liveStatusLabel}
              </span>
              {spacePath ? (
                <span className="hidden max-w-[240px] truncate sm:inline">{spacePath}</span>
              ) : (
                <span className="hidden sm:inline">/space/&lt;your-handle&gt;</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
          <Button asChild type="button" variant="ghost" size="sm" className="rounded-2xl text-muted-foreground hover:text-gray-900">
            <Link href="/space">
              <ArrowLeft className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          {spacePath ? (
            <>
              <CopySpaceLink path={spacePath} variant="icon" />
              {isPublished ? (
                <Button asChild type="button" variant="secondary" size="sm">
                  <Link href={spacePath} target="_blank" rel="noreferrer">
                    <span className="hidden sm:inline">View live</span>
                    <ExternalLink className="size-4 sm:ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  title="Publish to view your Space layout on the public URL."
                >
                  <span className="hidden sm:inline">View live</span>
                  <ExternalLink className="size-4 sm:ml-2" />
                </Button>
              )}
            </>
          ) : null}

          <div className="hidden items-center gap-1 rounded-full bg-white/70 p-1 border border-white/60 shadow-soft lg:flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full",
                modulesOpen ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground",
              )}
              onClick={onToggleModules}
              title={modulesOpen ? "Hide modules panel" : "Show modules panel"}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full",
                inspectorOpen ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground",
              )}
              onClick={onToggleInspector}
              title={inspectorOpen ? "Hide editor panel" : "Show editor panel"}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
          </div>

          <div className="flex rounded-full bg-white/70 p-1 border border-white/60 shadow-soft">
            <Button
              type="button"
              variant={mode === "edit" ? "default" : "ghost"}
              size="sm"
              onClick={() => onModeChange("edit")}
              className={cn("rounded-full", mode === "edit" ? "" : "text-muted-foreground")}
            >
              <GripVertical className="mr-2 size-4" />
              Edit
            </Button>
            <Button
              type="button"
              variant={mode === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => onModeChange("preview")}
              className={cn("rounded-full", mode === "preview" ? "" : "text-muted-foreground")}
            >
              <Eye className="mr-2 size-4" />
              Preview
            </Button>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 shadow-soft lg:flex">
            <span className={cn("size-2 rounded-full", savingDotClass)} />
            <span className="text-xs font-semibold text-gray-700">{savingLabel}</span>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    type="button"
                    onClick={onPublish}
                    disabled={publishIsDisabled}
                    className="rounded-2xl bg-primary text-white shadow-glow hover:opacity-95 disabled:opacity-70"
                  >
                    <Rocket className="mr-2 size-4" />
                    {publishLabel}
                  </Button>
                </div>
              </TooltipTrigger>
              {publishTooltip ? (
                <TooltipContent side="bottom" className="text-xs">
                  {publishTooltip}
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};
