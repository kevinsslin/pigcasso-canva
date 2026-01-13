import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import { getSelectionContext, type SelectionContextEditor } from "@/features/canvases/lib/selection-context";
import type { CanvasChatAttachment } from "@/features/canvases/screens/canvas-screen/types";

export const buildCanvasChatContextAttachments = (
  editor: SelectionContextEditor,
  shapeIds: string[],
  options?: { max?: number },
): CanvasChatAttachment[] => {
  const max = Math.max(0, Math.floor(options?.max ?? 8));
  if (!Array.isArray(shapeIds) || !shapeIds.length || !max) return [];

  const out: CanvasChatAttachment[] = [];
  const seen = new Set<string>();

  for (const shapeIdRaw of shapeIds) {
    const shapeId = String(shapeIdRaw);
    if (!shapeId || seen.has(shapeId)) continue;
    seen.add(shapeId);

    const ctx = getSelectionContext(editor, shapeId);
    if (!ctx) continue;

    if (ctx.type === "image") {
      out.push({
        id: `ctx:${shapeId}`,
        type: "image",
        label: ctx.label,
        shapeId,
        url: ctx.previewUrl ?? undefined,
      });
    } else if (ctx.type === HTML_CARD_SHAPE_TYPE) {
      out.push({
        id: `ctx:${shapeId}`,
        type: "html",
        label: ctx.label,
        shapeId,
      });
    }

    if (out.length >= max) break;
  }

  return out;
};

