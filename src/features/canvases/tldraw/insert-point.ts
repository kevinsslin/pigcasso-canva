export type PagePoint = { x: number; y: number };

export type ViewportBounds = { x: number; y: number; w: number; h: number };

export type InsertionPointEditor = {
  inputs?: {
    currentPagePoint?: { x: number; y: number } | null;
  } | null;
  getViewportPageBounds: () => ViewportBounds;
};

export const getViewportCenter = (viewport: ViewportBounds): PagePoint => ({
  x: viewport.x + viewport.w / 2,
  y: viewport.y + viewport.h / 2,
});

export const getAiInsertPoint = (editor: InsertionPointEditor): PagePoint => {
  const viewport = editor.getViewportPageBounds();
  const cursor = editor.inputs?.currentPagePoint ?? null;

  const cursorX = cursor?.x;
  const cursorY = cursor?.y;
  const cursorValid =
    typeof cursorX === "number" &&
    typeof cursorY === "number" &&
    Number.isFinite(cursorX) &&
    Number.isFinite(cursorY);

  if (cursorValid) {
    const withinViewport =
      cursorX >= viewport.x &&
      cursorX <= viewport.x + viewport.w &&
      cursorY >= viewport.y &&
      cursorY <= viewport.y + viewport.h;

    if (withinViewport) {
      return { x: cursorX, y: cursorY };
    }
  }

  return getViewportCenter(viewport);
};

