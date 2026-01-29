"use client";

import { useEffect, useRef } from "react";
import type { Editor as TldrawEditor } from "tldraw";

import { handleCanvasDeleteShortcut, isEditableKeyboardTarget } from "@/features/canvases/tldraw/delete-shortcut";
import {
  handleCanvasKeyboardShortcuts,
  type CanvasClipboardRef,
} from "@/features/canvases/tldraw/keyboard-shortcuts";
import type { CanvasTool } from "@/features/canvases/lib/canvas-tools";

type UseCanvasHotkeysParams = {
  editor: TldrawEditor | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  clipboardRef: CanvasClipboardRef;
};

export const useCanvasHotkeys = ({
  editor,
  boardHydrated,
  boardCrashMessage,
  activeTool,
  onToolChange,
  clipboardRef,
}: UseCanvasHotkeysParams) => {
  const heldPanToolRef = useRef<CanvasTool | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(document.activeElement)) return;
      const handledDelete = handleCanvasDeleteShortcut(editor as any, event);
      const handledShortcut = handleCanvasKeyboardShortcuts(editor as any, event, {
        clipboardRef,
        onToolChange,
      });

      if (handledDelete || handledShortcut) return;
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [boardCrashMessage, boardHydrated, clipboardRef, editor, onToolChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== " " && event.code !== "Space") return;
      try {
        if ((editor as any).getEditingShapeId?.()) return;
      } catch {
        // ignore
      }
      if (isEditableKeyboardTarget(document.activeElement ?? event.target)) return;
      if (activeTool === "hand") return;
      if (heldPanToolRef.current) return;

      event.preventDefault();
      heldPanToolRef.current = activeTool;
      onToolChange("hand");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== " " && event.code !== "Space") return;
      if (!heldPanToolRef.current) return;

      event.preventDefault();
      const previous = heldPanToolRef.current;
      heldPanToolRef.current = null;
      onToolChange(previous);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      heldPanToolRef.current = null;
    };
  }, [activeTool, boardCrashMessage, boardHydrated, editor, onToolChange]);
};
