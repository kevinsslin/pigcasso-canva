import { useEffect, useMemo, useState } from "react";
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
  const [provider, setProvider] = useState<"replicate" | "gemini">("replicate");

  const aiMeta = me.data?.data.ai;
  const providers = aiMeta?.providers;

  useEffect(() => {
    if (!aiMeta) {
      return;
    }
    if (aiMeta.defaultProvider === "gemini" && providers?.gemini) {
      setProvider("gemini");
    }
  }, [aiMeta, providers?.gemini]);

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

    mutation.mutate({ prompt: value, provider }, {
      onSuccess: ({ data }) => {
        editor?.addImage(data);
        setValue("");
      },
      onError: (err) => {
        const status = getApiErrorStatus(err);
        if (status === 429) {
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={provider === "replicate" ? "default" : "outline"}
                onClick={() => setProvider("replicate")}
                disabled={mutation.isPending}
              >
                Replicate
              </Button>
              <Button
                type="button"
                variant={provider === "gemini" ? "default" : "outline"}
                onClick={() => setProvider("gemini")}
                disabled={mutation.isPending || providers?.gemini === false}
              >
                Gemini
              </Button>
            </div>
            {remainingText && (
              <p className="text-xs text-muted-foreground">{remainingText}</p>
            )}
            {providers?.gemini === false && (
              <p className="text-xs text-muted-foreground">
                Gemini requires `GEMINI_API_KEY` on the server.
              </p>
            )}
          </div>
          <Textarea
            disabled={mutation.isPending}
            placeholder="An astronaut riding a horse on mars, hd, dramatic lighting"
            cols={30}
            rows={10}
            required
            minLength={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            disabled={mutation.isPending}
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
