import { AssetRecordType, createShapeId } from "@tldraw/tlschema";

export type InsertImagePagePoint = { x: number; y: number };

export type InsertImageSize = { w: number; h: number };

export type InsertImageEditor = {
  createAssets?: (assets: unknown[]) => unknown;
  createShapes?: (shapes: unknown[]) => unknown;
  select?: (...shapeIds: unknown[]) => unknown;
  run?: (fn: () => void) => unknown;
};

export const DEFAULT_MAX_IMAGE_SHAPE_DIMENSION = 720;

const containSize = (size: InsertImageSize, maxDimension: number): InsertImageSize => {
  const { w, h } = size;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { w: maxDimension, h: maxDimension };
  }

  const maxSide = Math.max(w, h);
  if (maxSide <= maxDimension) return { w, h };

  const scale = maxDimension / maxSide;
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
};

const loadImageSize = async (src: string): Promise<InsertImageSize> => {
  if (typeof Image === "undefined") {
    throw new Error("Image is not available in this environment.");
  }

  return await new Promise<InsertImageSize>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error("Image loaded without dimensions."));
        return;
      }
      resolve({ w, h });
    };

    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = src;
  });
};

export async function insertImageToCanvas(
  editor: InsertImageEditor,
  options: {
    src: string;
    point: InsertImagePagePoint;
    name?: string;
    mimeType?: string;
    fileSize?: number;
    size?: InsertImageSize;
    maxShapeDimension?: number;
  },
): Promise<{ assetId: string; shapeId: string }> {
  const maxShapeDimension = options.maxShapeDimension ?? DEFAULT_MAX_IMAGE_SHAPE_DIMENSION;
  const resolvedSize =
    options.size ??
    (await loadImageSize(options.src).catch(() => ({
      w: maxShapeDimension,
      h: maxShapeDimension,
    })));
  const shapeSize = containSize(resolvedSize, maxShapeDimension);

  const assetId = AssetRecordType.createId();
  const shapeId = createShapeId();

  const asset = {
    id: assetId,
    typeName: "asset",
    type: "image",
    props: {
      name: options.name ?? "Image",
      src: options.src,
      w: resolvedSize.w,
      h: resolvedSize.h,
      fileSize: Math.max(1, Math.floor(options.fileSize ?? 1)),
      mimeType: options.mimeType ?? "image/png",
      isAnimated: false,
    },
    meta: {},
  };

  const shape = {
    id: shapeId,
    type: "image",
    x: options.point.x - shapeSize.w / 2,
    y: options.point.y - shapeSize.h / 2,
    opacity: 1,
    props: {
      assetId,
      w: shapeSize.w,
      h: shapeSize.h,
    },
  };

  const apply = () => {
    if (typeof editor.createAssets === "function") {
      editor.createAssets([asset]);
    }
    if (typeof editor.createShapes === "function") {
      editor.createShapes([shape]);
    }
    editor.select?.(shapeId);
  };

  if (typeof editor.run === "function") {
    editor.run(() => apply());
  } else {
    apply();
  }

  return { assetId, shapeId };
}
