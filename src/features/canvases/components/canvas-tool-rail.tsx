"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CANVAS_TOOL_BUTTONS, type CanvasTool } from "../lib/canvas-tools";

export const CanvasToolRail = ({
  activeTool,
  disabled = false,
  onToolChange,
  className,
}: {
  activeTool: CanvasTool;
  disabled?: boolean;
  onToolChange: (tool: CanvasTool) => void;
  className?: string;
}) => {
  return (
    <aside
      className={cn("fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col", className)}
      aria-label="Canvas tools"
      data-testid="canvas-tool-rail"
    >
      <div className="bg-card/80 backdrop-blur shadow-soft rounded-full py-4 px-2 flex flex-col gap-1 items-center border border-border">
        {CANVAS_TOOL_BUTTONS.map(({ tool, label, icon: Icon }) => (
          <Button
            key={tool}
            type="button"
            size="icon"
            variant={activeTool === tool ? "default" : "ghost"}
            className="rounded-full"
            onClick={() => onToolChange(tool)}
            disabled={disabled}
            aria-label={label}
            title={label}
          >
            <Icon className="size-5" />
          </Button>
        ))}
      </div>
    </aside>
  );
};

