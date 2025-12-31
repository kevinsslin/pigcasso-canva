import Image from "next/image";
import { fabric } from "fabric";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useMe } from "@/features/auth/api/use-me";
import { useRemoveBg } from "@/features/ai/api/use-remove-bg";

import { getApiErrorStatus } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RemoveBgSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const RemoveBgSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: RemoveBgSidebarProps) => {
  const me = useMe();
  const mutation = useRemoveBg();

  const selectedObject = editor?.selectedObjects[0];
  const [provider, setProvider] = useState<"auto" | "replicate" | "gemini">(
    "auto",
  );

  const imageSrc = useMemo(() => {
    if (!selectedObject || selectedObject.type !== "image") {
      return null;
    }
    const imageObject = selectedObject as fabric.Image;
    const src = imageObject.getSrc();
    return src || null;
  }, [selectedObject]);

  const aiMeta = me.data?.data.ai;
  const providers = aiMeta?.providers;

  useEffect(() => {
    if (!aiMeta) {
      return;
    }

    try {
      const stored = localStorage.getItem("pigcasso:ai-provider-default");
      if (
        stored === "gemini" &&
        providers?.gemini
      ) {
        setProvider("gemini");
        return;
      }
      if (
        stored === "replicate" &&
        providers?.replicate
      ) {
        setProvider("replicate");
        return;
      }
    } catch {
      // ignore
    }

    setProvider("auto");
  }, [aiMeta, providers?.gemini, providers?.replicate]);

  const remainingText = useMemo(() => {
    const limit = aiMeta?.limits?.removeBg;
    const used = aiMeta?.usage?.removeBgCount;
    if (limit === undefined || used === undefined) {
      return null;
    }
    if (limit === 0) {
      return "Unlimited";
    }
    return `${Math.max(0, limit - used)} left today`;
  }, [aiMeta?.limits?.removeBg, aiMeta?.usage?.removeBgCount]);

  const autoEnabled =
    providers?.gemini !== false || providers?.replicate !== false;

  const providerEnabled =
    provider === "auto"
      ? autoEnabled
      : provider === "gemini"
        ? providers?.gemini !== false
        : providers?.replicate !== false;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onClick = () => {
    if (!imageSrc) {
      toast.error("Select an image to remove its background.");
      return;
    }

    mutation.mutate({
      image: imageSrc,
      provider,
    }, {
      onSuccess: ({ data }) => {
        editor?.addImage(data);
      },
      onError: (err) => {
        const status = getApiErrorStatus(err);
        if (status === 429 && err.message.toLowerCase().includes("daily limit")) {
          toast.error("Daily AI limit reached. Try again tomorrow or unlock Pro.");
          return;
        }
        toast.error(err.message || "Failed to remove background");
      },
    });
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "remove-bg" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Background removal"
        description="Remove background from image using AI"
      />
      {!imageSrc && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            Feature not available for this object
          </p>
        </div>
      )}
      {imageSrc && (
        <ScrollArea>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={provider === "auto" ? "default" : "outline"}
                  onClick={() => setProvider("auto")}
                  disabled={mutation.isPending || !autoEnabled}
                >
                  Auto
                </Button>
                <Button
                  type="button"
                  variant={provider === "replicate" ? "default" : "outline"}
                  onClick={() => setProvider("replicate")}
                  disabled={mutation.isPending || providers?.replicate === false}
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
              {provider === "auto" ? (
                <p className="text-xs text-muted-foreground">
                  Auto uses <span className="font-medium">{aiMeta?.defaultProvider}</span>{" "}
                  and falls back if the provider is unavailable.
                </p>
              ) : null}
              {remainingText && (
                <p className="text-xs text-muted-foreground">{remainingText}</p>
              )}
              {providers?.replicate === false && (
                <p className="text-xs text-muted-foreground">
                  Replicate is currently unavailable.
                </p>
              )}
              {provider === "gemini" && (
                <p className="text-xs text-muted-foreground">
                  Gemini remove-bg is experimental.
                </p>
              )}
            </div>
            <div className={cn(
              "relative aspect-square rounded-md overflow-hidden transition bg-muted",
              mutation.isPending && "opacity-50",
            )}>
              <Image
                src={imageSrc}
                fill
                alt="Image"
                className="object-cover"
              />
            </div>
            <Button
              disabled={mutation.isPending || !providerEnabled}
              onClick={onClick}
              className="w-full"
            >
              Remove background
            </Button>
          </div>
        </ScrollArea>
      )}
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
