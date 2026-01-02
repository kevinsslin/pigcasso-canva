import { Eye, GripVertical, Rocket } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { SpaceBuilderMode } from "@/features/spaces/hooks/use-space-builder";

type SpaceBuilderHeaderProps = {
  mode: SpaceBuilderMode;
  onModeChange: (mode: SpaceBuilderMode) => void;
  onPublish: () => void;
  publishDisabled: boolean;
};

export const SpaceBuilderHeader = ({
  mode,
  onModeChange,
  onPublish,
  publishDisabled,
}: SpaceBuilderHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center overflow-hidden shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-pig.png" alt="Pigcasso" className="h-9 w-9 object-cover" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold tracking-tight text-gray-900">
              Pigcasso Space Builder
            </div>
            <div className="text-xs text-muted-foreground">Your Bento-style public gateway page</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <Button
            type="button"
            onClick={onPublish}
            disabled={publishDisabled}
            className="rounded-2xl bg-primary text-white shadow-glow hover:opacity-95"
          >
            <Rocket className="mr-2 size-4" />
            Publish
          </Button>
        </div>
      </div>
    </header>
  );
};

