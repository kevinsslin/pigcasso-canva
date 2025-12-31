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
  const aiEnabled = aiMeta?.configured !== false;

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

    if (!aiEnabled) {
      toast.error("AI is currently unavailable.");
      return;
    }

    mutation.mutate({ prompt: value }, {
      onSuccess: ({ data }) => {
        editor?.addImage(data);
        setValue("");
      },
      onError: (err) => {
        const status = getApiErrorStatus(err);
        if (status === 429 && err.message.toLowerCase().includes("daily limit")) {
          toast.error("Daily AI limit reached. Try again tomorrow or unlock Pro.");
          return;
        }
        toast.error(err.message || "Failed to generate image");
      }
    });
  };

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "ai" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="AI"
        description="Generate an image using AI"
      />
      <ScrollArea>
        <form onSubmit={onSubmit} className="p-4 space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Powered by Gemini.
            </p>
            {remainingText && (
              <p className="text-xs text-muted-foreground">{remainingText}</p>
            )}
            {aiMeta?.configured === false ? (
              <p className="text-xs text-muted-foreground">
                AI is currently unavailable.
              </p>
            ) : null}
          </div>
          <Textarea
            disabled={mutation.isPending || !aiEnabled}
            placeholder="An astronaut riding a horse on mars, hd, dramatic lighting"
            cols={30}
            rows={10}
            required
            minLength={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            disabled={mutation.isPending || !aiEnabled}
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
