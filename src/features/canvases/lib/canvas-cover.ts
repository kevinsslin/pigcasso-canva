export type CanvasCoverBounds = { w: number; h: number };

export const DEFAULT_CANVAS_COVER_TARGET_PX = 720;

export const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
};

export const getCanvasCoverScale = (
  bounds: CanvasCoverBounds,
  options?: { targetPx?: number; maxScale?: number; minScale?: number },
) => {
  const w = Number(bounds.w);
  const h = Number(bounds.h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 1;

  const targetPx = Number(options?.targetPx ?? DEFAULT_CANVAS_COVER_TARGET_PX);
  const maxScale = Number(options?.maxScale ?? 1);
  const minScale = Number(options?.minScale ?? 0.02);

  const maxDim = Math.max(w, h);
  const scale = targetPx > 0 ? targetPx / maxDim : 1;
  return clamp(scale, minScale, maxScale);
};

