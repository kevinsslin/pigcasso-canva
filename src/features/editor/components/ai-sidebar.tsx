import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useMe } from "@/features/auth/api/use-me";
import { useGenerateImage } from "@/features/ai/api/use-generate-image";

import { getApiErrorStatus } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const AiSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: AiSidebarProps) => {
  const me = useMe();
  const mutation = useGenerateImage();

  const [value, setValue] = useState("");
  const aiMeta = me.data?.data.ai;
  const geminiEnabled = aiMeta?.configured !== false;

  const remainingText = useMemo(() => {
    const limit = aiMeta?.limits?.generate;
    const used = aiMeta?.usage?.generateCount;
    if (limit === undefined || used === undefined) {
      return null;
    }
    if (limit === 0) {
      return "Unlimited";
    }
    return `${Math.max(0, limit - used)} left today`;
  }, [aiMeta?.limits?.generate, aiMeta?.usage?.generateCount]);

  const onSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const toastId = "pigcasso:ai-generate-image";
    if (!geminiEnabled) {
      toast.error("AI is currently unavailable.");
      return;
    }

    if (!editor) {
      toast.error("Canvas is not ready yet.", { id: toastId, duration: 3000 });
      return;
    }

    const workspace = editor.getWorkspace();
    const canvasSize =
      workspace && typeof workspace.width === "number" && typeof workspace.height === "number"
        ? { width: workspace.width, height: workspace.height }
        : undefined;

    toast.loading("Generating image…", { id: toastId, duration: Infinity });

    mutation.mutate(
      { prompt: value, canvas: canvasSize },
      {
        onSuccess: async ({ data }) => {
          toast.loading("Adding image to canvas…", { id: toastId, duration: Infinity });
          try {
            await editor.addImage(data);
            setValue("");
            toast.success("Image added to canvas.", { id: toastId, duration: 2000 });
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Failed to add image",
              { id: toastId, duration: 4000 },
            );
          }
        },
        onError: (err) => {
          const status = getApiErrorStatus(err);
          if (status === 429 && err.message.toLowerCase().includes("daily limit")) {
            toast.error("Daily AI limit reached. Try again tomorrow or unlock Pro.", {
              id: toastId,
              duration: 4000,
            });
            return;
          }
          toast.error(err.message || "Failed to generate image", { id: toastId, duration: 4000 });
        },
      },
    );
  };

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white border-border flex flex-col fixed inset-x-0 bottom-0 z-[70] h-[75vh] max-h-[75vh] rounded-t-2xl border-t shadow-2xl lg:relative lg:inset-auto lg:z-[40] lg:w-[360px] lg:h-full lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
        activeTool === "ai" ? "flex" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="AI"
        description="Generate an image using AI"
      />
      <ScrollArea className="flex-1">
        <form onSubmit={onSubmit} className="p-4 space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Powered by Gemini.</p>
            {remainingText && (
              <p className="text-xs text-muted-foreground">{remainingText}</p>
            )}
            {!geminiEnabled ? (
              <p className="text-xs text-muted-foreground">
                AI is currently unavailable.
              </p>
            ) : null}
          </div>
          <Textarea
            disabled={mutation.isPending || !geminiEnabled}
            placeholder="An astronaut riding a horse on mars, hd, dramatic lighting"
            cols={30}
            rows={10}
            required
            minLength={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            disabled={mutation.isPending || !geminiEnabled}
            type="submit"
            className="w-full"
          >
            Generate
          </Button>
        </form>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
