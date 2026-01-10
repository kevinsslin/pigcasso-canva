import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
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
      const src = typeof asset?.props?.src === "string" ? asset.props.src : null;
      return { shapeId, type, label: "Image", previewUrl: src };
    }

    if (type === "text") {
      return { shapeId, type, label: "Text" };
    }

    return { shapeId, type, label: type };
  } catch {
    return { shapeId, type: "shape", label: "Selected" };
  }
};
