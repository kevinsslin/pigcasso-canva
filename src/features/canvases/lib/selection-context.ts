import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import type { TLAsset, TLAssetId, TLParentId, TLShape } from "tldraw";

export type SelectionContext = {
  shapeId: string;
  type: string;
  label: string;
  previewUrl?: string | null;
};

export type SelectionContextEditor = {
  getShape: (shape: TLParentId | TLShape) => unknown;
  getAsset?: (asset: TLAsset | TLAssetId) => unknown;
};

export const getSelectionContext = (editor: SelectionContextEditor, shapeId: string | null): SelectionContext | null => {
  if (!shapeId) return null;
  const shortId = String(shapeId).split(":").pop() || "";

  try {
    const shape = editor.getShape(shapeId as any) as any;
    if (!shape || typeof shape !== "object") {
      return { shapeId, type: "shape", label: "Selected" };
    }

    const type = typeof shape.type === "string" ? shape.type : "shape";

    if (type === "frame") {
      const name = typeof shape.props?.name === "string" ? shape.props.name.trim() : "";
      return { shapeId, type, label: name || "Frame" };
    }

    if (type === HTML_CARD_SHAPE_TYPE) {
      return { shapeId, type, label: "HTML" };
    }

    if (type === "image") {
      const assetId = shape.props?.assetId;
      const asset = assetId ? ((editor.getAsset?.(assetId) as any) ?? null) : null;
      const rawSrc =
        (typeof asset?.meta?.originalSrc === "string" && asset.meta.originalSrc) ||
        (typeof asset?.meta?.rawSrc === "string" && asset.meta.rawSrc) ||
        (typeof asset?.props?.src === "string" && asset.props.src) ||
        null;
      const src = rawSrc ? toCanvasImageUrl(String(rawSrc)) : null;

      const rawName = typeof asset?.props?.name === "string" ? asset.props.name.trim() : "";
      const label = rawName && rawName !== "Image" ? rawName : shortId ? `Image • ${shortId}` : "Image";
      return { shapeId, type, label, previewUrl: src };
    }

    if (type === "text") {
      return { shapeId, type, label: "Text" };
    }

    return { shapeId, type, label: type };
  } catch {
    return { shapeId, type: "shape", label: "Selected" };
  }
};
