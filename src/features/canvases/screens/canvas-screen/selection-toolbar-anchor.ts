import type { CanvasSelectionToolbarAnchor } from "@/features/canvases/screens/canvas-screen/canvas-selection-toolbar";

type Bounds = { x: number; y: number; w: number; h: number };

const getToolbarSize = (kind: CanvasSelectionToolbarAnchor["kind"]) => {
  switch (kind) {
    case "text":
      return { width: 440, height: 68 };
    case "group":
      return { width: 260, height: 52 };
    case "html":
      return { width: 300, height: 52 };
    case "image":
    default:
      return { width: 420, height: 52 };
  }
};

export const computeCanvasSelectionToolbarAnchor = (params: {
  kind: CanvasSelectionToolbarAnchor["kind"];
  shapeId: string;
  bounds: Bounds;
  pageToScreen: (pt: { x: number; y: number }) => { x: number; y: number };
  viewport: { width: number; height: number };
  padding?: number;
  offset?: number;
}): CanvasSelectionToolbarAnchor => {
  const { kind, shapeId, bounds, pageToScreen, viewport } = params;

  const { width: toolbarWidth, height: toolbarHeight } = getToolbarSize(kind);
  const padding = Math.max(0, Math.floor(params.padding ?? 12));
  const offset = Math.max(0, Math.floor(params.offset ?? 10));

  const topCenter = pageToScreen({ x: bounds.x + bounds.w / 2, y: bounds.y });

  const rawX = topCenter.x - toolbarWidth / 2;
  // Place the toolbar above the selected object (Figma-style).
  const rawY = topCenter.y - toolbarHeight - offset;

  const maxX = viewport.width - toolbarWidth - padding;
  const maxY = viewport.height - toolbarHeight - padding;

  const screenX = Math.max(padding, Math.min(rawX, maxX));
  const screenY = Math.max(padding, Math.min(rawY, maxY));

  return { kind, shapeId, screenX, screenY };
};

export const computeCanvasSelectionToolbarAnchorFromScreenRect = (params: {
  kind: CanvasSelectionToolbarAnchor["kind"];
  shapeId: string;
  rect: { left: number; top: number; width: number; height: number };
  viewport: { width: number; height: number };
  padding?: number;
  offset?: number;
}): CanvasSelectionToolbarAnchor => {
  const { kind, shapeId, rect, viewport } = params;
  const { width: toolbarWidth, height: toolbarHeight } = getToolbarSize(kind);
  const padding = Math.max(0, Math.floor(params.padding ?? 12));
  const offset = Math.max(0, Math.floor(params.offset ?? 10));

  const centerX = rect.left + rect.width / 2;
  const topY = rect.top;

  const rawX = centerX - toolbarWidth / 2;
  const rawY = topY - toolbarHeight - offset;

  const maxX = viewport.width - toolbarWidth - padding;
  const maxY = viewport.height - toolbarHeight - padding;

  const screenX = Math.max(padding, Math.min(rawX, maxX));
  const screenY = Math.max(padding, Math.min(rawY, maxY));

  return { kind, shapeId, screenX, screenY };
};
