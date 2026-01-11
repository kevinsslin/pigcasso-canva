"use client";

import type { ComponentType } from "react";
import { Bot, Plus } from "lucide-react";

import type { CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CanvasMobileDockButton = {
  tool: CanvasTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const CanvasMobileDock = ({
  buttons,
  activeTool,
  disabled,
  onToolChange,
  onOpenChat,
  onCreateNew,
}: {
  buttons: CanvasMobileDockButton[];
  activeTool: CanvasTool;
  disabled: boolean;
  onToolChange: (tool: CanvasTool) => void;
  onOpenChat: () => void;
  onCreateNew: () => void;
}) => (
  <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
    <div className="h-[72px] px-2 flex items-center gap-1 overflow-x-auto">
      {buttons.map(({ tool, label, icon: Icon }) => (
        <Button
          key={tool}
          type="button"
          variant="ghost"
          onClick={() => onToolChange(tool)}
          disabled={disabled}
          className={cn(
            "min-w-[72px] h-[60px] px-3 flex flex-col items-center justify-center gap-1 rounded-xl",
            activeTool === tool ? "bg-muted text-primary" : undefined,
          )}
          aria-label={label}
        >
          <Icon className="size-5" />
          <span className="text-[10px] leading-none">{label}</span>
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        onClick={onOpenChat}
        className="min-w-[72px] h-[60px] px-3 flex flex-col items-center justify-center gap-1 rounded-xl"
        aria-label="Chat"
      >
        <Bot className="size-5" />
        <span className="text-[10px] leading-none">Chat</span>
      </Button>

      <Button
        type="button"
        variant="default"
        onClick={onCreateNew}
        className="min-w-[72px] h-[60px] px-3 flex flex-col items-center justify-center gap-1 rounded-xl"
        aria-label="New"
      >
        <Plus className="size-5" />
        <span className="text-[10px] leading-none">New</span>
      </Button>
    </div>
  </nav>
);

