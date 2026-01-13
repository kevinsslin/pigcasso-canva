"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  ChevronLeft,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Undo2,
} from "lucide-react";
import type { Editor as TldrawEditor } from "tldraw";

import { UserButton } from "@/features/auth/components/user-button";
import { CanvasPublishButton } from "@/features/canvases/components/canvas-publish-button";
import { CanvasShareButton } from "@/features/canvases/components/canvas-share-button";
import { EditableBoardTitle } from "@/features/canvases/components/editable-board-title";

import { Button } from "@/components/ui/button";

export const CanvasOverlayHeader = ({
  canvasId,
  canvasName,
  onRenameBoard,
  zoomPercent,
  editor,
  disabled,
  desktopChatOpen,
  onToggleDesktopChat,
  onOpenMobileChat,
  isPublished,
  isFullscreen,
  onToggleFullscreen,
}: {
  canvasId: string;
  canvasName: string;
  onRenameBoard: (nextName: string) => void;
  zoomPercent: number;
  editor: TldrawEditor | null;
  disabled: boolean;
  desktopChatOpen: boolean;
  onToggleDesktopChat: () => void;
  onOpenMobileChat: () => void;
  isPublished: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) => {
  return (
    <>
      <div className="absolute left-4 top-4 z-40 flex items-center gap-3">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
          aria-label="Back to app"
        >
          <span className="inline-flex items-center justify-center rounded-full border bg-card/80 backdrop-blur h-9 w-9 md:hidden">
            <ChevronLeft className="size-4" />
          </span>
          <span className="hidden md:inline-flex size-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 items-center justify-center overflow-hidden shadow-lg shadow-pink-500/20">
            <Image
              src="/logo-pig.png"
              alt="Pigcasso"
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          </span>
        </Link>

        <EditableBoardTitle name={canvasName} onRename={onRenameBoard} />
      </div>

      <div className="absolute left-1/2 top-4 z-40 hidden -translate-x-1/2 md:flex items-center gap-1 rounded-full border bg-card/80 backdrop-blur px-2 py-1 shadow-soft">
        <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
          {editor ? `${zoomPercent}%` : "—"}
        </span>
      </div>

      <div className="absolute right-4 top-4 z-40 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full hidden md:inline-flex"
          onClick={onToggleDesktopChat}
          aria-label="Toggle chat panel"
        >
          {desktopChatOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full hidden md:inline-flex"
          onClick={() => editor?.undo()}
          disabled={disabled}
          aria-label="Undo"
        >
          <Undo2 className="size-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full hidden md:inline-flex"
          onClick={() => editor?.redo()}
          disabled={disabled}
          aria-label="Redo"
        >
          <Redo2 className="size-4" />
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-full md:hidden"
          onClick={onOpenMobileChat}
          aria-label="Open chat"
        >
          <Bot className="size-4" />
        </Button>

        <CanvasShareButton canvasId={canvasId} className="hidden md:inline-flex" compact />

        <CanvasPublishButton
          canvasId={canvasId}
          isPublished={isPublished}
          disabled={disabled}
          className="hidden md:inline-flex rounded-full"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full hidden md:inline-flex"
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>

        <UserButton />
      </div>
    </>
  );
};

