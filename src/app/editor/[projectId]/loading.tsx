import { Loader2 } from "lucide-react";

const EditorLoading = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <div className="text-sm font-medium">Opening editor…</div>
        <div className="text-xs text-muted-foreground">
          Loading project and canvas.
        </div>
      </div>
    </div>
  );
};

export default EditorLoading;

