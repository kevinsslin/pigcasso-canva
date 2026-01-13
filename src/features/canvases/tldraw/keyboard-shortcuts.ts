import type { CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { isEditableKeyboardTarget } from "@/features/canvases/tldraw/delete-shortcut";

export type CanvasClipboardRef = { current: unknown | null };

export type CanvasShortcutEditor = {
  getEditingShapeId?: () => string | null | undefined;
  undo?: () => void;
  redo?: () => void;
  selectAll?: () => void;
  getSelectedShapeIds?: () => string[];
  duplicateShapes?: (shapeIds: string[], offset?: { x: number; y: number }) => unknown;
  groupShapes?: (shapeIds: string[]) => unknown;
  ungroupShapes?: (shapeIds: string[]) => unknown;
  bringForward?: (shapeIds: string[]) => unknown;
  bringToFront?: (shapeIds: string[]) => unknown;
  sendBackward?: (shapeIds: string[]) => unknown;
  sendToBack?: (shapeIds: string[]) => unknown;
  deleteShapes?: (shapeIds: string[]) => unknown;
  getContentFromCurrentPage?: (shapeIds: string[]) => unknown;
  putContentOntoCurrentPage?: (content: any, opts?: { select?: boolean }) => unknown;
};

export type CanvasShortcutHandlers = {
  clipboardRef?: CanvasClipboardRef;
  onToolChange?: (tool: CanvasTool) => void;
};

const getSelectedShapeIdsSafe = (editor: CanvasShortcutEditor): string[] => {
  try {
    const ids = editor.getSelectedShapeIds?.() ?? [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
};

const isAccelKey = (event: KeyboardEvent) => event.metaKey || event.ctrlKey;

export const handleCanvasKeyboardShortcuts = (
  editor: CanvasShortcutEditor,
  event: KeyboardEvent,
  handlers: CanvasShortcutHandlers = {},
): boolean => {
  if (event.defaultPrevented) return false;
  try {
    if (editor.getEditingShapeId?.()) return false;
  } catch {
    // ignore
  }
  if (isEditableKeyboardTarget(event.target)) return false;

  const key = (event.key || "").toLowerCase();

  if (event.altKey && (key === "arrowup" || key === "arrowdown")) {
    const ids = getSelectedShapeIdsSafe(editor);
    if (!ids.length) return false;
    event.preventDefault();
    if (key === "arrowup") {
      if (event.shiftKey) {
        editor.bringToFront?.(ids);
      } else {
        editor.bringForward?.(ids);
      }
    } else if (key === "arrowdown") {
      if (event.shiftKey) {
        editor.sendToBack?.(ids);
      } else {
        editor.sendBackward?.(ids);
      }
    }
    return true;
  }

  if (isAccelKey(event)) {
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        editor.redo?.();
      } else {
        editor.undo?.();
      }
      return true;
    }

    if (key === "y") {
      event.preventDefault();
      editor.redo?.();
      return true;
    }

    if (key === "a") {
      event.preventDefault();
      editor.selectAll?.();
      return true;
    }

    if (key === "d") {
      const ids = getSelectedShapeIdsSafe(editor);
      if (!ids.length) return false;
      event.preventDefault();
      editor.duplicateShapes?.(ids, { x: 16, y: 16 });
      return true;
    }

    if (key === "g") {
      const ids = getSelectedShapeIdsSafe(editor);
      if (!ids.length) return false;
      event.preventDefault();
      if (event.shiftKey) {
        editor.ungroupShapes?.(ids);
      } else {
        editor.groupShapes?.(ids);
      }
      return true;
    }

    if (key === "]") {
      const ids = getSelectedShapeIdsSafe(editor);
      if (!ids.length) return false;
      event.preventDefault();
      if (event.shiftKey) {
        editor.bringToFront?.(ids);
      } else {
        editor.bringForward?.(ids);
      }
      return true;
    }

    if (key === "[") {
      const ids = getSelectedShapeIdsSafe(editor);
      if (!ids.length) return false;
      event.preventDefault();
      if (event.shiftKey) {
        editor.sendToBack?.(ids);
      } else {
        editor.sendBackward?.(ids);
      }
      return true;
    }

    if (key === "c") {
      const ids = getSelectedShapeIdsSafe(editor);
      if (!ids.length) return false;
      if (!handlers.clipboardRef) return false;
      const content = editor.getContentFromCurrentPage?.(ids);
      if (!content) return false;
      event.preventDefault();
      handlers.clipboardRef.current = content;
      return true;
    }

    if (key === "x") {
      const ids = getSelectedShapeIdsSafe(editor);
      if (!ids.length) return false;
      if (!handlers.clipboardRef) return false;
      const content = editor.getContentFromCurrentPage?.(ids);
      if (!content) return false;
      event.preventDefault();
      handlers.clipboardRef.current = content;
      editor.deleteShapes?.(ids);
      return true;
    }

    if (key === "v") {
      const content = handlers.clipboardRef?.current;
      if (!content) return false;
      event.preventDefault();
      editor.putContentOntoCurrentPage?.(content as any, { select: true });
      return true;
    }
  }

  if (key === "escape") {
    if (!handlers.onToolChange) return false;
    event.preventDefault();
    handlers.onToolChange("select");
    return true;
  }

  if (!handlers.onToolChange) return false;
  if (key === "v") {
    event.preventDefault();
    handlers.onToolChange("select");
    return true;
  }
  if (key === "h") {
    event.preventDefault();
    handlers.onToolChange("hand");
    return true;
  }
  if (key === "d") {
    event.preventDefault();
    handlers.onToolChange("draw");
    return true;
  }
  if (key === "t") {
    event.preventDefault();
    handlers.onToolChange("text");
    return true;
  }
  if (key === "f") {
    event.preventDefault();
    handlers.onToolChange("frame");
    return true;
  }

  return false;
};
