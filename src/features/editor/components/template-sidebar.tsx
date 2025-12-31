import Image from "next/image";
import { AlertTriangle, Loader, Crown } from "lucide-react";
import { toast } from "sonner";

import { usePro } from "@/features/auth/hooks/use-pro";

import { 
  ActiveTool, 
  Editor,
} from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";

import { cn } from "@/lib/utils";
import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/hooks/use-confirm";

interface TemplateSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const TemplateSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: TemplateSidebarProps) => {
  const { isPro } = usePro();

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "You are about to replace the current project with this template."
  )

  const { data, isLoading, isError, error } = useGetTemplates({
    limit: "20",
    page: "1",
  });

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onClick = async (template: ResponseType["data"][0]) => {
    if (template.isPro && !isPro) {
      toast.error("Pro template locked. Hold 100,000 PIGCASSO to unlock Pro.");
      return;
    }

    const ok = await confirm();

    if (ok) {
      const response = await client.api.templates[":id"].$get({
        param: { id: template.id },
      });

      let body: { data: { json?: string | null } };
      try {
        body = await readApiResponse(response, ({ status }) =>
          status === 403
            ? "Pro template locked. Hold 100,000 PIGCASSO to unlock Pro."
            : "Failed to load template",
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load template");
        return;
      }

      const { data } = body;
      if (!data.json) {
        toast.error("Pro template locked. Hold 100,000 PIGCASSO to unlock Pro.");
        return;
      }

      editor?.loadJson(data.json);
    }
  };

  return (
    <aside
      className={cn(
        "bg-white border-border flex flex-col fixed inset-x-0 bottom-0 z-[70] h-[75vh] max-h-[75vh] rounded-t-2xl border-t shadow-2xl lg:relative lg:inset-auto lg:z-[40] lg:w-[360px] lg:h-full lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
        activeTool === "templates" ? "flex" : "hidden",
      )}
    >
      <ConfirmDialog />
      <ToolSidebarHeader
        title="Templates"
        description="Choose from a variety of templates to get started"
      />
      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader className="size-4 text-muted-foreground animate-spin" />
        </div>
      )}
      {isError && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            {error?.message || "Failed to fetch templates"}
          </p>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {data && data.map((template) => {
              return (
                <button
                  style={{ 
                    aspectRatio: `${template.width}/${template.height}`
                  }}
                  onClick={() => onClick(template)}
                  key={template.id}
                  className="relative w-full group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
                >
                  {template.thumbnailUrl ? (
                    <Image
                      fill
                      src={template.thumbnailUrl}
                      alt={template.name || "Template"}
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]" />
                  )}
                  {template.isPro && (
                    <div className="absolute top-2 right-2 size-8 items-center flex justify-center bg-black/50 rounded-full">
                      <Crown className="size-4 fill-yellow-500 text-yellow-500" />
                    </div>
                  )}
                  <div
                    className="opacity-0 group-hover:opacity-100 absolute left-0 bottom-0 w-full text-[10px] truncate text-white p-1 bg-black/50 text-left"
                  >
                    {template.name}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
