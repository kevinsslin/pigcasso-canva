import type { Editor as TldrawEditor } from "tldraw";

import { DEFAULT_MAX_IMAGE_SHAPE_DIMENSION } from "@/features/canvases/tldraw/insert-image";
import { getAiInsertPoint, type PagePoint } from "@/features/canvases/tldraw/insert-point";

type ImageShapeLike = {
  id?: string | null;
  props?: {
    w?: number;
    h?: number;
  } | null;
};

type ImageAssetLike = {
  props?: {
    w?: number;
    h?: number;
  } | null;
};

type Bounds = { x: number; y: number; w: number; h: number };

type PlacementOptions = {
  minGap?: number;
  gapRatio?: number;
  fallbackPoint?: PagePoint;
};

type AssetEditor = {
  getAsset?: (id: string) => unknown;
  updateAssets?: (assets: unknown[]) => unknown;
};

const readPositiveNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
};

const readBounds = (raw: unknown): Bounds | null => {
  if (!raw || typeof raw !== "object") return null;
  const typed = raw as Bounds;
  if (
    !Number.isFinite(typed.x) ||
    !Number.isFinite(typed.y) ||
    !Number.isFinite(typed.w) ||
    !Number.isFinite(typed.h)
  ) {
    return null;
  }
  if (typed.w <= 0 || typed.h <= 0) return null;
  return typed;
};

export const resolveImageSize = (shape: ImageShapeLike | null, asset?: ImageAssetLike | null, fallback = 1024) => {
  const shapeW = readPositiveNumber(shape?.props?.w);
  const shapeH = readPositiveNumber(shape?.props?.h);
  const assetW = readPositiveNumber(asset?.props?.w);
  const assetH = readPositiveNumber(asset?.props?.h);

  return {
    w: shapeW ?? assetW ?? fallback,
    h: shapeH ?? assetH ?? fallback,
  };
};

export const getMaxShapeDimension = (size: { w: number; h: number } | null) => {
  const maxSide = size ? Math.max(size.w, size.h) : DEFAULT_MAX_IMAGE_SHAPE_DIMENSION;
  if (!Number.isFinite(maxSide) || maxSide <= 0) {
    return DEFAULT_MAX_IMAGE_SHAPE_DIMENSION;
  }
  return Math.max(DEFAULT_MAX_IMAGE_SHAPE_DIMENSION, Math.round(maxSide));
};

export const getSelectedImagePlacement = (
  editor: TldrawEditor,
  shape: ImageShapeLike | null,
  options: PlacementOptions = {},
) => {
  const minGap = Number.isFinite(options.minGap) ? Math.max(0, options.minGap ?? 0) : 96;
  const gapRatio = Number.isFinite(options.gapRatio) ? Math.max(0, options.gapRatio ?? 0) : 0.25;

  let bounds: Bounds | null = null;
  if (shape?.id) {
    try {
      bounds = readBounds(editor.getShapePageBounds?.(shape.id as any));
    } catch {
      bounds = null;
    }
  }

  const point = (() => {
    if (options.fallbackPoint) return options.fallbackPoint;
    if (bounds) {
      const gap = Math.max(minGap, bounds.w * gapRatio);
      return {
        x: bounds.x + bounds.w + gap,
        y: bounds.y + bounds.h * 0.5,
      };
    }
    return getAiInsertPoint(editor as any);
  })();

  return { point, bounds };
};

export const updateAssetOriginalSrc = (
  editor: AssetEditor,
  assetId: string | null | undefined,
  originalSrc: string | null | undefined,
) => {
  if (!assetId || !originalSrc) return;
  try {
    const asset = editor.getAsset?.(assetId) as any;
    if (!asset) return;
    editor.updateAssets?.([
      {
        ...asset,
        meta: { ...(asset.meta ?? {}), originalSrc },
      },
    ]);
  } catch {
    // ignore
  }
};
