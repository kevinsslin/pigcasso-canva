export type FindImageInGroupEditor = {
  getSortedChildIdsForParent?: (parent: unknown) => unknown[];
  getShape?: (id: unknown) => unknown;
};

const safeGetSortedChildIds = (editor: FindImageInGroupEditor, parentId: string) => {
  try {
    const raw = editor.getSortedChildIdsForParent?.(parentId as any);
    if (!Array.isArray(raw)) return [];
    return raw.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
};

export const findFirstImageShapeIdInGroup = (
  editor: FindImageInGroupEditor,
  groupShapeId: string,
): string | null => {
  const visited = new Set<string>();

  const visit = (shapeId: string): string | null => {
    if (!shapeId) return null;
    if (visited.has(shapeId)) return null;
    visited.add(shapeId);

    const shape = (() => {
      try {
        return editor.getShape?.(shapeId as any) as any;
      } catch {
        return null;
      }
    })();

    if (shape && typeof shape === "object" && shape.type === "image") {
      return shapeId;
    }

    const childIds = safeGetSortedChildIds(editor, shapeId);
    for (const childId of childIds) {
      const found = visit(childId);
      if (found) return found;
    }

    return null;
  };

  const childIds = safeGetSortedChildIds(editor, groupShapeId);
  for (const childId of childIds) {
    const found = visit(childId);
    if (found) return found;
  }

  return null;
};

