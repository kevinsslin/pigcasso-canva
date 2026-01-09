import { Frame, Hand, MousePointer2, Pencil, TextCursor, type LucideIcon } from "lucide-react";

export type CanvasTool = "select" | "hand" | "draw" | "text" | "frame";

export const CANVAS_TOOL_BUTTONS: Array<{ tool: CanvasTool; label: string; icon: LucideIcon }> = [
  { tool: "select", label: "Select", icon: MousePointer2 },
  { tool: "hand", label: "Pan", icon: Hand },
  { tool: "draw", label: "Draw", icon: Pencil },
  { tool: "text", label: "Text", icon: TextCursor },
  { tool: "frame", label: "Frame", icon: Frame },
];

export const toTldrawToolId = (tool: CanvasTool) => {
  if (tool === "frame") return "frame";
  return tool;
};

export const fromTldrawToolId = (toolId: string): CanvasTool | null => {
  if (toolId === "select") return "select";
  if (toolId === "hand") return "hand";
  if (toolId === "draw") return "draw";
  if (toolId === "text") return "text";
  if (toolId === "frame") return "frame";
  return null;
};
