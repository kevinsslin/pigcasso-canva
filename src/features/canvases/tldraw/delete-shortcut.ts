export type DeleteShortcutEditor = {
  getEditingShapeId?: () => string | null | undefined;
  getSelectedShapeIds?: () => string[];
  deleteShapes?: (shapeIds: string[]) => unknown;
};

export const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (typeof HTMLElement === "undefined") return false;
  if (!target || !(target instanceof HTMLElement)) return false;

  // tldraw uses hidden inputs / contenteditable elements to capture keyboard events.
  // Treat targets inside the tldraw container as non-editable so Delete works reliably.
  if (target.closest(".tl-container")) return false;

  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;

  return Boolean(target.closest("input,textarea,select,[contenteditable=\"true\"]"));
};

export const handleCanvasDeleteShortcut = (
  editor: DeleteShortcutEditor,
  event: KeyboardEvent,
): boolean => {
  if (event.defaultPrevented) return false;
  if (event.key !== "Backspace" && event.key !== "Delete") return false;

  const editingShapeId = (() => {
    try {
      return editor.getEditingShapeId?.() ?? null;
    } catch {
      return null;
    }
  })();

  if (editingShapeId) return false;
  if (isEditableKeyboardTarget(event.target)) return false;

  const selected = (() => {
    try {
      return editor.getSelectedShapeIds?.() ?? [];
    } catch {
      return [];
    }
  })();

  if (!selected.length) return false;

  try {
    event.preventDefault();
    editor.deleteShapes?.(selected);
    return true;
  } catch {
    return false;
  }
};
