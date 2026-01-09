"use client";

import {
  ImageIcon,
  LayoutTemplate,
  Pencil,
  Settings,
  Shapes,
  Sparkles,
  Type,
} from "lucide-react";

import type { ActiveTool } from "@/features/editor/types";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileToolDockProps {
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

const DockButton = ({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "min-w-[72px] h-full px-3 py-2 flex flex-col items-center justify-center gap-1 rounded-none",
        active && "bg-muted text-primary",
      )}
    >
      {icon}
      <span className="text-[10px] leading-none">{label}</span>
    </Button>
  );
};

export const MobileToolDock = ({
  activeTool,
  onChangeActiveTool,
}: MobileToolDockProps) => {
  return (
    <nav className="lg:hidden border-t border-border/60 bg-card/90 backdrop-blur h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] shrink-0 overflow-x-auto">
      <div className="flex items-stretch h-full">
        <DockButton
          active={activeTool === "templates"}
          label="Design"
          icon={<LayoutTemplate className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("templates")}
        />
        <DockButton
          active={activeTool === "images"}
          label="Images"
          icon={<ImageIcon className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("images")}
        />
        <DockButton
          active={activeTool === "text"}
          label="Text"
          icon={<Type className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("text")}
        />
        <DockButton
          active={activeTool === "shapes"}
          label="Shapes"
          icon={<Shapes className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("shapes")}
        />
        <DockButton
          active={activeTool === "draw"}
          label="Draw"
          icon={<Pencil className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("draw")}
        />
        <DockButton
          active={activeTool === "ai"}
          label="AI"
          icon={<Sparkles className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("ai")}
        />
        <DockButton
          active={activeTool === "settings"}
          label="Settings"
          icon={<Settings className="size-5 stroke-2" />}
          onClick={() => onChangeActiveTool("settings")}
        />
      </div>
    </nav>
  );
};
