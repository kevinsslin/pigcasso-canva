"use client";

import { useCallback, useMemo, useState } from "react";
import type { Editor as TldrawEditor } from "tldraw";

import { unwrapCanvasImageProxyUrl } from "@/features/canvases/lib/image-proxy";
import type { SelectionContext } from "@/features/canvases/lib/selection-context";
import {
  buildTextFontFamilyMetaPatch,
  clampCanvasTextScale,
  getCanvasTextSizePx,
  pickCanvasTextSizeAndScaleFromPx,
  PIGCASSO_TEXT_FONT_FAMILY_META_KEY,
  type CanvasTextSize,
} from "@/features/canvases/lib/text-style";
import type { CanvasSelectionToolbarAnchor } from "@/features/canvases/screens/canvas-screen/canvas-selection-toolbar";
import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import { findFirstImageShapeIdInGroup } from "@/features/canvases/tldraw/find-image-in-group";

type UseCanvasSelectionParams = {
  editor: TldrawEditor | null;
  selectionToolbarSuppressed: boolean;
};

export const useCanvasSelection = ({ editor, selectionToolbarSuppressed }: UseCanvasSelectionParams) => {
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectionToolbarAnchor, setSelectionToolbarAnchor] = useState<CanvasSelectionToolbarAnchor | null>(null);
  const [selectedTextStyleKey, setSelectedTextStyleKey] = useState("");

  const selectedTextShape = useMemo(() => {
    void selectedTextStyleKey;
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== "text") return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds, selectedTextStyleKey]);

  const selectedImageShape = useMemo(() => {
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== "image") return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds]);

  const selectedHtmlShape = useMemo(() => {
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== HTML_CARD_SHAPE_TYPE) return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds]);

  const selectedGroupShape = useMemo(() => {
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== "group") return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds]);

  const selectedImageAsset = useMemo(() => {
    if (!editor) return null;
    const assetId = (selectedImageShape as any)?.props?.assetId;
    if (!assetId) return null;
    try {
      return (editor.getAsset?.(assetId) as any) ?? null;
    } catch {
      return null;
    }
  }, [editor, selectedImageShape]);

  const selectedImageAiSrc = useMemo(() => {
    const metaSrcRaw = (selectedImageAsset as any)?.meta?.originalSrc ?? (selectedImageAsset as any)?.meta?.rawSrc;
    if (typeof metaSrcRaw === "string" && metaSrcRaw.trim()) {
      return unwrapCanvasImageProxyUrl(metaSrcRaw.trim());
    }

    const src = (selectedImageAsset as any)?.props?.src;
    if (typeof src !== "string" || !src.trim()) return null;
    return unwrapCanvasImageProxyUrl(src.trim());
  }, [selectedImageAsset]);

  const selectedTextStyle = useMemo(() => {
    void selectedTextStyleKey;
    const props = (selectedTextShape as any)?.props ?? {};
    const font = typeof props.font === "string" ? props.font : "draw";
    const rawSize = typeof props.size === "string" ? props.size : "m";
    const size: CanvasTextSize = rawSize === "s" || rawSize === "m" || rawSize === "l" || rawSize === "xl" ? rawSize : "m";
    const color = typeof props.color === "string" ? props.color : "black";
    const scale = clampCanvasTextScale(Number(props.scale ?? 1) || 1);
    const sizePx = getCanvasTextSizePx(size, scale);
    const metaFontFamily = (selectedTextShape as any)?.meta?.[PIGCASSO_TEXT_FONT_FAMILY_META_KEY];
    const fontFamily = typeof metaFontFamily === "string" && metaFontFamily.trim() ? metaFontFamily.trim() : null;
    return { font, size, color, sizePx, fontFamily };
  }, [selectedTextShape, selectedTextStyleKey]);

  const resolvedSelectionToolbarAnchor = useMemo(() => {
    if (selectionToolbarSuppressed) return null;
    if (!selectionToolbarAnchor) return null;
    if (selectedShapeIds.length !== 1) return null;
    if (selectionToolbarAnchor.shapeId !== selectedShapeIds[0]) return null;
    if (selectionToolbarAnchor.kind === "image" && !selectedImageShape) return null;
    if (selectionToolbarAnchor.kind === "html" && !selectedHtmlShape) return null;
    if (selectionToolbarAnchor.kind === "text" && !selectedTextShape) return null;
    if (selectionToolbarAnchor.kind === "group" && !selectedGroupShape) return null;
    return selectionToolbarAnchor;
  }, [
    selectionToolbarSuppressed,
    selectionToolbarAnchor,
    selectedGroupShape,
    selectedHtmlShape,
    selectedImageShape,
    selectedShapeIds,
    selectedTextShape,
  ]);

  const updateSelectedTextStyle = useCallback(
    (
      partial: Partial<{ font: string; size: string; color: string; sizePx: number; fontFamily: string | null }>,
    ) => {
      if (!editor) return;
      if (!selectedTextShape) return;
      try {
        const nextProps: Record<string, unknown> = {};
        const fontFamilyTouched = Object.prototype.hasOwnProperty.call(partial, "fontFamily");
        let metaPatch: Record<string, unknown> | undefined;

        if (fontFamilyTouched) {
          const raw = partial.fontFamily;
          if (typeof raw === "string" && raw.trim()) {
            metaPatch = { ...(metaPatch ?? {}), ...buildTextFontFamilyMetaPatch(raw) };
            if (partial.font === undefined) {
              nextProps.font = "sans";
            }
          } else {
            metaPatch = { ...(metaPatch ?? {}), ...buildTextFontFamilyMetaPatch(null) };
          }
        }

        if (typeof partial.font === "string" && partial.font.trim()) {
          nextProps.font = partial.font;
          if (!fontFamilyTouched) {
            metaPatch = { ...(metaPatch ?? {}), ...buildTextFontFamilyMetaPatch(null) };
          }
        }

        if (typeof partial.color === "string" && partial.color.trim()) {
          nextProps.color = partial.color;
        }

        if (typeof partial.sizePx === "number") {
          const { size, scale } = pickCanvasTextSizeAndScaleFromPx(partial.sizePx);
          nextProps.size = size;
          nextProps.scale = scale;
        } else if (typeof partial.size === "string" && partial.size.trim()) {
          nextProps.size = partial.size;
          nextProps.scale = 1;
        }

        editor.updateShape?.({
          id: selectedTextShape.id as any,
          type: "text",
          ...(Object.keys(nextProps).length ? { props: nextProps } : null),
          ...(metaPatch ? { meta: metaPatch } : null),
        } as any);
      } catch {
        // ignore
      }
    },
    [editor, selectedTextShape],
  );

  const selectedGroupMintImageShapeId = useMemo(() => {
    if (!editor) return null;
    if (!selectedGroupShape) return null;
    return findFirstImageShapeIdInGroup(editor as any, String((selectedGroupShape as any).id));
  }, [editor, selectedGroupShape]);

  return {
    selectionContext,
    setSelectionContext,
    selectedShapeIds,
    setSelectedShapeIds,
    selectionToolbarAnchor,
    setSelectionToolbarAnchor,
    selectedTextStyleKey,
    setSelectedTextStyleKey,
    selectedTextShape,
    selectedImageShape,
    selectedHtmlShape,
    selectedGroupShape,
    selectedImageAsset,
    selectedImageAiSrc,
    selectedTextStyle,
    updateSelectedTextStyle,
    resolvedSelectionToolbarAnchor,
    selectedGroupMintImageShapeId,
  };
};
