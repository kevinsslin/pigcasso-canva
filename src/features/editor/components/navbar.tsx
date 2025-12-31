"use client";

import { useEffect, useState } from "react";
import { CiFileOn } from "react-icons/ci";
import { BsCloudCheck, BsCloudSlash } from "react-icons/bs";
import { useFilePicker } from "use-file-picker";
import { useMutationState } from "@tanstack/react-query";
import { 
  ChevronDown, 
  Download, 
  Loader, 
  MoreHorizontal,
  MousePointerClick, 
  Pencil,
  Redo2, 
  Undo2
} from "lucide-react";

import { UserButton } from "@/features/auth/components/user-button";
import { useUpdateProject } from "@/features/projects/api/use-update-project";

import { ActiveTool, Editor } from "@/features/editor/types";
import { Logo } from "@/features/editor/components/logo";
import { ExportPackDialog } from "@/features/editor/components/export-pack-dialog";
import { PublishTemplateDialog } from "@/features/editor/components/publish-template-dialog";

import { cn } from "@/lib/utils";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NavbarProps {
  id: string;
  projectName: string;
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const Navbar = ({
  id,
  projectName,
  editor,
  activeTool,
  onChangeActiveTool,
}: NavbarProps) => {
  const updateProjectMutation = useUpdateProject(id);
  const [packOpen, setPackOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(projectName);
  const [draftName, setDraftName] = useState(projectName);

  useEffect(() => {
    if (renameOpen) {
      return;
    }
    setName(projectName);
    setDraftName(projectName);
  }, [projectName, renameOpen]);

  const onOpenRename = () => {
    setDraftName(name);
    setRenameOpen(true);
  };

  const onRename = (nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      return;
    }

    updateProjectMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          setName(trimmed);
          setRenameOpen(false);
        },
      },
    );
  };

  const data = useMutationState({
    filters: {
      mutationKey: ["project", { id }],
      exact: true,
    },
    select: (mutation) => mutation.state.status,
  });

  const currentStatus = data[data.length - 1];

  const isError = currentStatus === "error";
  const isPending = currentStatus === "pending";

  const { openFilePicker } = useFilePicker({
    accept: ".json",
    onFilesSuccessfullySelected: ({ plainFiles }: { plainFiles: File[] }) => {
      const file = plainFiles?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = () => {
        if (typeof reader.result === "string") {
          editor?.loadJson(reader.result);
        }
      };
    },
  });

  return (
    <nav className="w-full flex items-center p-3 sm:p-4 h-[68px] gap-x-3 sm:gap-x-6 border-b lg:pl-[34px]">
      <Logo />
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRename(draftName);
            }}
            className="space-y-4"
          >
            <Input
              autoFocus
              value={draftName}
              minLength={1}
              maxLength={80}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={updateProjectMutation.isPending}
              placeholder="Project name"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRenameOpen(false)}
                disabled={updateProjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending || !draftName.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ExportPackDialog
        open={packOpen}
        onOpenChange={setPackOpen}
        editor={editor}
        projectName={name}
      />
      <PublishTemplateDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        editor={editor}
        projectId={id}
        projectName={name}
      />
      <div className="w-full flex items-center gap-x-1 h-full">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onOpenRename}
          className="max-w-[140px] sm:max-w-[220px] justify-start gap-x-2 px-2"
        >
          <span className="truncate font-medium">{name}</span>
          <Pencil className="size-3 text-muted-foreground shrink-0" />
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="px-2">
              <span className="hidden sm:inline">File</span>
              <MoreHorizontal className="size-4 sm:hidden" />
              <ChevronDown className="size-4 ml-2 hidden sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-60">
            <DropdownMenuItem
              onClick={() => openFilePicker()}
              className="flex items-center gap-x-2"
            >
              <CiFileOn className="size-8" />
              <div>
                <p>Open</p>
                <p className="text-xs text-muted-foreground">
                  Open a JSON file
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPublishOpen(true)}
              className="flex items-center gap-x-2"
            >
              <CiFileOn className="size-8" />
              <div>
                <p>Publish as template</p>
                <p className="text-xs text-muted-foreground">
                  Create a share link and enable remix
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="mx-2" />
        <Hint label="Select" side="bottom" sideOffset={10}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChangeActiveTool("select")}
            className={cn(activeTool === "select" && "bg-gray-100")}
          >
            <MousePointerClick className="size-4" />
          </Button>
        </Hint>
        <Hint label="Undo" side="bottom" sideOffset={10}>
          <Button
            disabled={!editor?.canUndo()}
            variant="ghost"
            size="icon"
            onClick={() => editor?.onUndo()}
          >
            <Undo2 className="size-4" />
          </Button>
        </Hint>
        <Hint label="Redo" side="bottom" sideOffset={10}>
          <Button
            disabled={!editor?.canRedo()}
            variant="ghost"
            size="icon"
            onClick={() => editor?.onRedo()}
          >
            <Redo2 className="size-4" />
          </Button>
        </Hint>
        <Separator orientation="vertical" className="mx-2" />
        {isPending && ( 
          <div className="flex items-center gap-x-2">
            <Loader className="size-4 animate-spin text-muted-foreground" />
            <div className="hidden sm:block text-xs text-muted-foreground">
              Saving...
            </div>
          </div>
        )}
        {!isPending && isError && ( 
          <div className="flex items-center gap-x-2">
            <BsCloudSlash className="size-[20px] text-muted-foreground" />
            <div className="hidden sm:block text-xs text-muted-foreground">
              Failed to save
            </div>
          </div>
        )}
        {!isPending && !isError && ( 
          <div className="flex items-center gap-x-2">
            <BsCloudCheck className="size-[20px] text-muted-foreground" />
            <div className="hidden sm:block text-xs text-muted-foreground">
              Saved
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-x-4">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <span className="hidden sm:inline">Export</span>
                <Download className="size-4 sm:ml-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-60">
              <DropdownMenuItem
                className="flex items-center gap-x-2"
                onClick={() => editor?.saveJson()}
              >
                <CiFileOn className="size-8" />
                <div>
                  <p>JSON</p>
                  <p className="text-xs text-muted-foreground">
                    Save for later editing
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-x-2"
                onClick={() => editor?.savePng()}
              >
                <CiFileOn className="size-8" />
                <div>
                  <p>PNG</p>
                  <p className="text-xs text-muted-foreground">
                    Best for sharing on the web
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-x-2"
                onClick={() => editor?.saveJpg()}
              >
                <CiFileOn className="size-8" />
                <div>
                  <p>JPG</p>
                  <p className="text-xs text-muted-foreground">
                    Best for printing
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-x-2"
                onClick={() => editor?.saveSvg()}
              >
                <CiFileOn className="size-8" />
                <div>
                  <p>SVG</p>
                  <p className="text-xs text-muted-foreground">
                    Best for editing in vector software
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-x-2"
                onClick={() => setPackOpen(true)}
              >
                <CiFileOn className="size-8" />
                <div>
                  <p>Pack (Pro)</p>
                  <p className="text-xs text-muted-foreground">
                    Multi-size export (ZIP or files)
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <UserButton />
        </div>
      </div>
    </nav>
  );
};
