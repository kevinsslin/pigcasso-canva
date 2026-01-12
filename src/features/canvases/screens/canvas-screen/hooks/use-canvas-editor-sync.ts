"use client";

import { useEffect, type MutableRefObject } from "react";
import type { Editor as TldrawEditor } from "tldraw";

import { fromTldrawToolId, type CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { getSelectionContext, type SelectionContext } from "@/features/canvases/lib/selection-context";
import { PIGCASSO_TEXT_FONT_FAMILY_META_KEY } from "@/features/canvases/lib/text-style";
import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import type { CanvasSelectionToolbarAnchor } from "@/features/canvases/screens/canvas-screen/canvas-selection-toolbar";
import {
  computeCanvasSelectionToolbarAnchor,
  computeCanvasSelectionToolbarAnchorFromScreenRect,
} from "@/features/canvases/screens/canvas-screen/selection-toolbar-anchor";

type UseCanvasEditorSyncParams = {
  editor: TldrawEditor | null;
  setActiveTool: (tool: CanvasTool) => void;
  setZoomPercent: (value: number) => void;
  setSelectedShapeIds: (value: string[]) => void;
  setSelectedTextStyleKey: (value: string) => void;
  setSelectionContext: (value: SelectionContext | null) => void;
  setSelectionToolbarAnchor: (value: CanvasSelectionToolbarAnchor | null) => void;
  lastKnownToolIdRef: MutableRefObject<CanvasTool | null>;
  lastZoomPercentRef: MutableRefObject<number | null>;
  lastSelectedShapeIdsKeyRef: MutableRefObject<string>;
  lastSelectedTextStyleKeyRef: MutableRefObject<string>;
  lastSelectionShapeIdRef: MutableRefObject<string | null>;
  lastSelectionToolbarKeyRef: MutableRefObject<string>;
};

export const useCanvasEditorSync = ({
  editor,
  setActiveTool,
  setZoomPercent,
  setSelectedShapeIds,
  setSelectedTextStyleKey,
  setSelectionContext,
  setSelectionToolbarAnchor,
  lastKnownToolIdRef,
  lastZoomPercentRef,
  lastSelectedShapeIdsKeyRef,
  lastSelectedTextStyleKeyRef,
  lastSelectionShapeIdRef,
  lastSelectionToolbarKeyRef,
}: UseCanvasEditorSyncParams) => {
  useEffect(() => {
    if (!editor) return;

    let raf = 0;

    const sync = () => {
      try {
        const currentToolId = editor.getCurrentToolId();
        if (currentToolId) {
          const mapped = fromTldrawToolId(currentToolId);
          if (mapped && lastKnownToolIdRef.current !== mapped) {
            lastKnownToolIdRef.current = mapped;
            setActiveTool(mapped);
          }
        }
      } catch {
        // ignore
      }

      try {
        const next = Math.round(editor.getZoomLevel() * 100);
        if (Number.isFinite(next) && lastZoomPercentRef.current !== next) {
          lastZoomPercentRef.current = next;
          setZoomPercent(next);
        }
      } catch {
        // ignore
      }

      try {
        const selectedIds = (editor.getSelectedShapeIds?.() ?? []).map((id) => String(id));
        const selectedKey = selectedIds.join(",");

        if (selectedKey !== lastSelectedShapeIdsKeyRef.current) {
          lastSelectedShapeIdsKeyRef.current = selectedKey;
          setSelectedShapeIds(selectedIds);
        }

        const nextTextStyleKey = (() => {
          if (selectedIds.length !== 1) return "";
          const shapeId = selectedIds[0];
          if (!shapeId) return "";
          const shape = editor.getShape?.(shapeId as any) as any;
          if (!shape || typeof shape !== "object" || shape.type !== "text") return "";

          const props = (shape.props ?? {}) as Record<string, unknown>;
          const font = typeof props.font === "string" ? props.font : "";
          const size = typeof props.size === "string" ? props.size : "";
          const color = typeof props.color === "string" ? props.color : "";
          const scaleRaw = props.scale;
          const scale = typeof scaleRaw === "number" ? String(scaleRaw) : typeof scaleRaw === "string" ? scaleRaw : "";
          const metaFontFamily = (shape.meta as any)?.[PIGCASSO_TEXT_FONT_FAMILY_META_KEY];
          const fontFamily = typeof metaFontFamily === "string" ? metaFontFamily.trim() : "";
          return `${shapeId}:${font}:${size}:${color}:${scale}:${fontFamily}`;
        })();

        if (nextTextStyleKey !== lastSelectedTextStyleKeyRef.current) {
          lastSelectedTextStyleKeyRef.current = nextTextStyleKey;
          setSelectedTextStyleKey(nextTextStyleKey);
        }

        const selected = selectedIds[0] ?? null;
        if (selected !== lastSelectionShapeIdRef.current) {
          lastSelectionShapeIdRef.current = selected;
          setSelectionContext(getSelectionContext(editor, selected));
        }
      } catch {
        // ignore
      }

      try {
        if (typeof window === "undefined") return;

        const nextToolbarAnchor = (() => {
          const selectedIds = (editor.getSelectedShapeIds?.() ?? []).map((id) => String(id));
          if (selectedIds.length !== 1) return null;
          const shapeId = selectedIds[0];
          if (!shapeId) return null;

          const shape = editor.getShape?.(shapeId as any) as any;
          const kind =
            shape?.type === "image"
              ? ("image" as const)
              : shape?.type === "text"
                ? ("text" as const)
                : shape?.type === HTML_CARD_SHAPE_TYPE
                  ? ("html" as const)
                  : shape?.type === "group"
                    ? ("group" as const)
                  : null;
          if (!kind) return null;

          const viewport = { width: window.innerWidth, height: window.innerHeight };

          const domEl = document.querySelector(`[data-shape-id=\"${shapeId}\"]`) as HTMLElement | null;
          if (domEl) {
            const rect = domEl.getBoundingClientRect();
            if (rect && rect.width > 0 && rect.height > 0) {
              return computeCanvasSelectionToolbarAnchorFromScreenRect({
                kind,
                shapeId,
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                viewport,
              });
            }
          }

          const bounds = (() => {
            try {
              return editor.getShapePageBounds?.(shapeId as any) as any;
            } catch {
              return null;
            }
          })();

          const pageToScreen = (() => {
            try {
              const fn = (editor as any).pageToScreen as
                | ((pt: { x: number; y: number }) => { x: number; y: number })
                | undefined;
              return typeof fn === "function" ? fn : undefined;
            } catch {
              return undefined;
            }
          })();

          if (bounds && typeof bounds === "object" && pageToScreen) {
            const pageToScreenWithOffset = (pt: { x: number; y: number }) => {
              const screen = pageToScreen(pt);
              const x = Number((screen as any)?.x);
              const y = Number((screen as any)?.y);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: viewport.width / 2, y: viewport.height / 2 };

              const tlContainer = document.querySelector(".tl-container") as HTMLElement | null;
              const rect = tlContainer?.getBoundingClientRect?.() ?? null;
              if (!rect) return { x, y };

              const isContainerRelative = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
              const isWindowRelative = x >= rect.left && y >= rect.top && x <= rect.right && y <= rect.bottom;

              if (isContainerRelative && !isWindowRelative) {
                return { x: x + rect.left, y: y + rect.top };
              }
              return { x, y };
            };

            try {
              const anchor = computeCanvasSelectionToolbarAnchor({
                kind,
                shapeId,
                bounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
                pageToScreen: pageToScreenWithOffset,
                viewport,
              });
              if (Number.isFinite(anchor.screenX) && Number.isFinite(anchor.screenY)) return anchor;
            } catch {
              // ignore
            }
          }

          return computeCanvasSelectionToolbarAnchorFromScreenRect({
            kind,
            shapeId,
            rect: { left: viewport.width / 2, top: 96, width: 0, height: 0 },
            viewport,
          });
        })();

        const key = nextToolbarAnchor
          ? `${nextToolbarAnchor.kind}:${Math.round(nextToolbarAnchor.screenX)}:${Math.round(nextToolbarAnchor.screenY)}:${nextToolbarAnchor.shapeId}`
          : "";

        if (key !== lastSelectionToolbarKeyRef.current) {
          lastSelectionToolbarKeyRef.current = key;
          setSelectionToolbarAnchor(nextToolbarAnchor);
        }
      } catch {
        // ignore
      }
    };

    const onChange = () => {
      if (typeof window === "undefined") return;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    sync();
    const unsubscribe = (() => {
      try {
        return editor.store.listen(onChange);
      } catch {
        return null;
      }
    })();

    return () => {
      if (typeof window !== "undefined" && raf) {
        window.cancelAnimationFrame(raf);
      }
      unsubscribe?.();
    };
  }, [
    editor,
    lastKnownToolIdRef,
    lastSelectedShapeIdsKeyRef,
    lastSelectedTextStyleKeyRef,
    lastSelectionShapeIdRef,
    lastSelectionToolbarKeyRef,
    lastZoomPercentRef,
    setActiveTool,
    setSelectedShapeIds,
    setSelectedTextStyleKey,
    setSelectionContext,
    setSelectionToolbarAnchor,
    setZoomPercent,
  ]);
};
