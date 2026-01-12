"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor as TldrawEditor } from "tldraw";

import { generateHtmlPreviewDataUrl, PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY } from "@/features/canvases/lib/html-preview";
import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";

type UseCanvasHtmlPreviewsParams = {
  editor: TldrawEditor | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
};

export const useCanvasHtmlPreviews = ({ editor, boardHydrated, boardCrashMessage }: UseCanvasHtmlPreviewsParams) => {
  const htmlPreviewInFlightRef = useRef<Set<string>>(new Set());
  const hasEnsuredHtmlPreviewsRef = useRef(false);

  const ensureHtmlCardPreview = useCallback(
    async (shapeId: string, html: string) => {
      if (!editor) return;
      if (!html.trim()) return;

      const inFlight = htmlPreviewInFlightRef.current;
      if (inFlight.has(shapeId)) return;
      inFlight.add(shapeId);

      try {
        let w = 960;
        let h = 600;
        try {
          const shape = editor.getShape?.(shapeId as any) as any;
          const rawW = Number(shape?.props?.w);
          const rawH = Number(shape?.props?.h);
          if (Number.isFinite(rawW) && rawW > 0 && Number.isFinite(rawH) && rawH > 0) {
            w = Math.max(320, Math.min(1200, Math.round(rawW)));
            h = Math.max(200, Math.min(1200, Math.round((w * rawH) / rawW)));
          }
        } catch {
          // ignore
        }

        try {
          (editor as any).run(
            () => {
              editor.updateShape?.({
                id: shapeId as any,
                type: HTML_CARD_SHAPE_TYPE,
                meta: { [PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY]: "rendering" },
              } as any);
            },
            { history: "ignore" },
          );
        } catch {
          // ignore
        }

        const previewDataUrl = await generateHtmlPreviewDataUrl({ html, width: w, height: h });
        const nextMetaValue = previewDataUrl || "failed";

        try {
          (editor as any).run(
            () => {
              editor.updateShape?.({
                id: shapeId as any,
                type: HTML_CARD_SHAPE_TYPE,
                meta: { [PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY]: nextMetaValue },
              } as any);
            },
            { history: "ignore" },
          );
        } catch {
          // ignore
        }
      } finally {
        inFlight.delete(shapeId);
      }
    },
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;
    if (hasEnsuredHtmlPreviewsRef.current) return;

    hasEnsuredHtmlPreviewsRef.current = true;

    const candidates = (editor.getCurrentPageShapes?.() ?? [])
      .filter((shape) => (shape as any)?.type === HTML_CARD_SHAPE_TYPE)
      .slice(0, 4) as any[];

    if (!candidates.length) return;

    let canceled = false;
    const run = async () => {
      for (const shape of candidates) {
        if (canceled) return;
        const html = typeof shape?.props?.html === "string" ? shape.props.html : "";
        if (!html.trim()) continue;
        const previewRaw = shape?.meta?.[PIGCASSO_HTML_PREVIEW_DATA_URL_META_KEY];
        if (typeof previewRaw === "string" && previewRaw.startsWith("data:image/png")) continue;
        if (previewRaw === "rendering") continue;
        await ensureHtmlCardPreview(String(shape.id), html);
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [boardCrashMessage, boardHydrated, editor, ensureHtmlCardPreview]);

  return { ensureHtmlCardPreview };
};

