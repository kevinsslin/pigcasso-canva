import type { Editor as TldrawEditor } from "tldraw";

import { getCanvasCoverScale } from "@/features/canvases/lib/canvas-cover";

export const exportCurrentCanvasPageToPngDataUrl = async (
  editor: TldrawEditor,
  options?: { targetPx?: number; padding?: number; pixelRatio?: number },
) => {
  const shapes = (editor.getCurrentPageShapes?.() ?? []) as any[];
  const shapeIds = shapes
    .map((shape) => shape?.id)
    .filter(Boolean) as any[];

  if (!shapeIds.length) {
    throw new Error("No shapes to export.");
  }

  const bounds = (editor.getCurrentPageBounds?.() ?? null) as any;
  if (
    !bounds ||
    !Number.isFinite(bounds.w) ||
    !Number.isFinite(bounds.h) ||
    bounds.w <= 0 ||
    bounds.h <= 0
  ) {
    throw new Error("Invalid canvas bounds.");
  }

  const scale = getCanvasCoverScale(
    { w: Number(bounds.w), h: Number(bounds.h) },
    { targetPx: options?.targetPx ?? 2048, maxScale: 1, minScale: 0.02 },
  );

  const dataUrl = await (editor as any).toImageDataUrl(shapeIds, {
    format: "png",
    scale,
    background: true,
    padding: options?.padding ?? 24,
    pixelRatio: options?.pixelRatio ?? 2,
    darkMode: false,
  });

  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("Failed to export canvas image.");
  }

  return dataUrl;
};

