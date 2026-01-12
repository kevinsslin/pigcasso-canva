import type { Editor as TldrawEditor } from "tldraw";

type CanvasBox = { x: number; y: number; w: number; h: number };

const isFiniteBox = (value: unknown): value is CanvasBox => {
  if (!value || typeof value !== "object") return false;
  const box = value as Record<string, unknown>;
  const x = Number(box.x);
  const y = Number(box.y);
  const w = Number(box.w);
  const h = Number(box.h);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
};

const unionBoxes = (a: CanvasBox | null, b: CanvasBox | null): CanvasBox | null => {
  if (!a) return b;
  if (!b) return a;
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.w, b.x + b.w);
  const maxY = Math.max(a.y + a.h, b.y + b.h);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

const intersects = (a: CanvasBox, b: CanvasBox) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const expandBox = (box: CanvasBox, padding: number) => ({
  x: box.x - padding,
  y: box.y - padding,
  w: box.w + padding * 2,
  h: box.h + padding * 2,
});

const isPageId = (value: string) => value.startsWith("page:");

const normalizeImageDataUrl = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  const url = (value as any)?.url;
  return typeof url === "string" ? url : null;
};

const getExportScale = (bounds: { w: number; h: number }, options?: { targetPx?: number; maxScale?: number }) => {
  const w = Number(bounds.w);
  const h = Number(bounds.h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 1;
  const targetPx = Number(options?.targetPx ?? 2048);
  const maxScale = Number(options?.maxScale ?? 1);
  const maxDim = Math.max(w, h);
  const scale = targetPx > 0 ? targetPx / maxDim : 1;
  return Number.isFinite(scale) ? Math.min(maxScale, scale) : 1;
};

const collectDescendantShapeIds = (editor: TldrawEditor, rootId: string) => {
  const visited = new Set<string>();
  const result: string[] = [];

  const visit = (id: string) => {
    if (!id) return;
    if (visited.has(id)) return;
    visited.add(id);
    result.push(id);

    const childIds = (() => {
      try {
        const raw = (editor as any).getSortedChildIdsForParent?.(id as any);
        if (!Array.isArray(raw)) return [];
        return raw.map((child) => String(child)).filter(Boolean);
      } catch {
        return [];
      }
    })();

    for (const childId of childIds) {
      visit(childId);
    }
  };

  visit(rootId);
  return result;
};

const findAncestorFrameId = (editor: TldrawEditor, shapeId: string): string | null => {
  let currentId = shapeId;
  for (let depth = 0; depth < 12; depth += 1) {
    const shape = (() => {
      try {
        return (editor as any).getShape?.(currentId as any) as any;
      } catch {
        return null;
      }
    })();

    if (!shape || typeof shape !== "object") return null;
    if (shape.type === "frame") return String(shape.id ?? currentId);

    const parentIdRaw = typeof shape.parentId === "string" ? shape.parentId : "";
    if (!parentIdRaw) return null;
    if (isPageId(parentIdRaw)) return null;

    const parentShape = (() => {
      try {
        return (editor as any).getShape?.(parentIdRaw as any) as any;
      } catch {
        return null;
      }
    })();

    if (!parentShape || typeof parentShape !== "object") return null;
    if (parentShape.type === "frame") return String(parentShape.id ?? parentIdRaw);
    currentId = String(parentShape.id ?? parentIdRaw);
  }
  return null;
};

const safeGetShapePageBounds = (editor: TldrawEditor, shapeId: string): CanvasBox | null => {
  try {
    const bounds = (editor as any).getShapePageBounds?.(shapeId as any) as any;
    return isFiniteBox(bounds) ? bounds : null;
  } catch {
    return null;
  }
};

const getShapeType = (editor: TldrawEditor, shapeId: string): string => {
  try {
    const shape = (editor as any).getShape?.(shapeId as any) as any;
    return typeof shape?.type === "string" ? shape.type : "shape";
  } catch {
    return "shape";
  }
};

export const getCanvasExportShapeIdsForSelection = (
  editor: TldrawEditor,
  shapeId: string,
  options?: { padding?: number },
) => {
  const padding = Math.max(0, Number(options?.padding ?? 48));

  const shapeType = getShapeType(editor, shapeId);
  const hasChildren = (() => {
    try {
      const raw = (editor as any).getSortedChildIdsForParent?.(shapeId as any);
      return Array.isArray(raw) && raw.length > 0;
    } catch {
      return false;
    }
  })();

  if (shapeType === "frame" || hasChildren) {
    return collectDescendantShapeIds(editor, shapeId);
  }

  const frameId = findAncestorFrameId(editor, shapeId);
  if (frameId) {
    const ids = collectDescendantShapeIds(editor, frameId).filter((id) => getShapeType(editor, id) !== "frame");
    return ids.length ? ids : [shapeId];
  }

  const targetBounds = safeGetShapePageBounds(editor, shapeId);
  if (!targetBounds) return [shapeId];

  const expanded = expandBox(targetBounds, padding);
  const pageId = (() => {
    try {
      const raw = (editor as any).getCurrentPageId?.();
      return typeof raw === "string" ? raw : null;
    } catch {
      return null;
    }
  })();

  const allIds = pageId ? collectDescendantShapeIds(editor, pageId) : [];
  const ids = new Set<string>();
  ids.add(shapeId);

  for (const id of allIds) {
    if (!id || isPageId(id)) continue;
    if (getShapeType(editor, id) === "frame") continue;
    const bounds = safeGetShapePageBounds(editor, id);
    if (!bounds) continue;
    if (intersects(bounds, expanded)) ids.add(id);
  }

  return Array.from(ids);
};

const exportShapeIdsToPngDataUrl = async (
  editor: TldrawEditor,
  shapeIds: string[],
  options?: { targetPx?: number; padding?: number; pixelRatio?: number; background?: boolean },
) => {
  if (!shapeIds.length) {
    throw new Error("No shapes to export.");
  }

  const bounds = shapeIds.reduce<CanvasBox | null>((acc, id) => unionBoxes(acc, safeGetShapePageBounds(editor, id)), null);
  if (!bounds) throw new Error("Invalid canvas bounds.");

  const scale = getExportScale(
    { w: Number(bounds.w), h: Number(bounds.h) },
    { targetPx: options?.targetPx ?? 2048, maxScale: 1 },
  );

  const exportResult = await (editor as any).toImageDataUrl(shapeIds, {
    format: "png",
    scale,
    background: options?.background ?? true,
    padding: options?.padding ?? 24,
    pixelRatio: options?.pixelRatio ?? 2,
    darkMode: false,
  });

  const dataUrl = normalizeImageDataUrl(exportResult);
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    throw new Error("Failed to export canvas image.");
  }

  return dataUrl;
};

export const exportCurrentCanvasPageToPngDataUrl = async (
  editor: TldrawEditor,
  options?: { targetPx?: number; padding?: number; pixelRatio?: number; background?: boolean },
) => {
  const shapes = (editor.getCurrentPageShapes?.() ?? []) as any[];
  const shapeIds = shapes.map((shape) => shape?.id).filter(Boolean).map((id) => String(id));
  return exportShapeIdsToPngDataUrl(editor, shapeIds, options);
};

export const exportCanvasSelectionToPngDataUrl = async (
  editor: TldrawEditor,
  options: { shapeId: string; targetPx?: number; padding?: number; pixelRatio?: number; background?: boolean },
) => {
  const shapeId = options.shapeId.trim();
  if (!shapeId) throw new Error("Missing shape id.");
  const shapeIds = getCanvasExportShapeIdsForSelection(editor, shapeId, { padding: 48 });
  return exportShapeIdsToPngDataUrl(editor, shapeIds, options);
};
