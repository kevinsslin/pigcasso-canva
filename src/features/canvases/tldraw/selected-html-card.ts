import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";

type UnknownShape = {
  type?: unknown;
  props?: unknown;
};

export type SelectedHtmlCard = {
  shapeId: string;
  html: string;
};

export type SelectedHtmlCardEditor = {
  getSelectedShapeIds?: () => string[];
  getShape?: (id: string) => UnknownShape | undefined;
};

export const getSelectedHtmlCard = (
  editor: SelectedHtmlCardEditor | null | undefined,
): SelectedHtmlCard | null => {
  if (!editor) return null;

  let selectedId: string | null = null;
  try {
    selectedId = editor.getSelectedShapeIds?.()?.[0] ?? null;
  } catch {
    selectedId = null;
  }

  if (!selectedId) return null;

  let shape: UnknownShape | undefined;
  try {
    shape = editor.getShape?.(selectedId);
  } catch {
    shape = undefined;
  }

  if (!shape || shape.type !== HTML_CARD_SHAPE_TYPE) return null;

  const htmlRaw = (shape.props as { html?: unknown } | undefined)?.html;
  if (typeof htmlRaw !== "string") return null;

  const html = htmlRaw.trim();
  if (!html) return null;

  return { shapeId: selectedId, html };
};

