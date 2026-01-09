"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider delayDuration={120}>
      <aside
        className={cn("fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col", className)}
        aria-label="Canvas tools"
        data-testid="canvas-tool-rail"
      >
        <nav className="bg-card/80 backdrop-blur shadow-soft rounded-full py-4 px-2 flex flex-col gap-5 items-center border border-border">
          {CANVAS_TOOL_BUTTONS.map(({ tool, label, icon: Icon }) => (
            <Tooltip key={tool}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={activeTool === tool ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => onToolChange(tool)}
                  disabled={disabled}
                  aria-label={label}
                >
                  <Icon className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
};
