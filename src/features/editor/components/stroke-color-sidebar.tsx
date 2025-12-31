import { ActiveTool, Editor, STROKE_COLOR } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ColorPicker } from "@/features/editor/components/color-picker";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StrokeColorSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const StrokeColorSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: StrokeColorSidebarProps) => {
  const value = editor?.getActiveStrokeColor() || STROKE_COLOR;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onChange = (value: string) => {
    editor?.changeStrokeColor(value);
  };

  return (
    <aside
      className={cn(
        "bg-white border-border flex flex-col fixed inset-x-0 bottom-0 z-[70] h-[75vh] max-h-[75vh] rounded-t-2xl border-t shadow-2xl lg:relative lg:inset-auto lg:z-[40] lg:w-[360px] lg:h-full lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
        activeTool === "stroke-color" ? "flex" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Stroke color"
        description="Add stroke color to your element"
      />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <ColorPicker
            value={value}
            onChange={onChange}
          />
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
