export type VecLike = { x: number; y: number };

export type TabAnchor = {
  screenPoint: VecLike;
  pagePoint: VecLike;
  shapeId: string | null;
};

export type TabAnchorEditor = {
  screenToPage: (point: VecLike) => VecLike;
  getShapeAtPoint: (point: VecLike, opts?: unknown) => { id: string } | undefined;
};

export const getTabAnchor = (editor: TabAnchorEditor, screenPoint: VecLike): TabAnchor => {
  const pagePoint = editor.screenToPage(screenPoint);
  const shape = editor.getShapeAtPoint(pagePoint);
  return {
    screenPoint,
    pagePoint,
    shapeId: shape?.id ?? null,
  };
};

