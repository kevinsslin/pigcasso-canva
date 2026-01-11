import { describe, expect, test } from "bun:test";

import {
  computeCanvasSelectionToolbarAnchor,
  computeCanvasSelectionToolbarAnchorFromScreenRect,
} from "@/features/canvases/screens/canvas-screen/selection-toolbar-anchor";

describe("computeCanvasSelectionToolbarAnchor", () => {
  test("places the toolbar above the selected object", () => {
    const anchor = computeCanvasSelectionToolbarAnchor({
      kind: "image",
      shapeId: "shape:image",
      bounds: { x: 400, y: 200, w: 200, h: 200 },
      pageToScreen: (pt) => pt,
      viewport: { width: 1200, height: 900 },
      offset: 10,
      padding: 12,
    });

    expect(anchor.kind).toBe("image");
    expect(anchor.shapeId).toBe("shape:image");
    expect(anchor.screenX).toBe(290);
    expect(anchor.screenY).toBe(138);
  });

  test("clamps to the viewport when the object is near the top edge", () => {
    const anchor = computeCanvasSelectionToolbarAnchor({
      kind: "image",
      shapeId: "shape:image",
      bounds: { x: 500, y: 30, w: 200, h: 200 },
      pageToScreen: (pt) => pt,
      viewport: { width: 1200, height: 900 },
      offset: 10,
      padding: 12,
    });

    expect(anchor.screenY).toBe(12);
  });

  test("clamps to the viewport when the object is near the right edge", () => {
    const anchor = computeCanvasSelectionToolbarAnchor({
      kind: "image",
      shapeId: "shape:image",
      bounds: { x: 900, y: 200, w: 200, h: 200 },
      pageToScreen: (pt) => pt,
      viewport: { width: 1024, height: 900 },
      offset: 10,
      padding: 12,
    });

    expect(anchor.screenX).toBe(592);
  });
});

describe("computeCanvasSelectionToolbarAnchorFromScreenRect", () => {
  test("places the toolbar above the selected object", () => {
    const anchor = computeCanvasSelectionToolbarAnchorFromScreenRect({
      kind: "image",
      shapeId: "shape:image",
      rect: { left: 400, top: 200, width: 200, height: 200 },
      viewport: { width: 1200, height: 900 },
      offset: 10,
      padding: 12,
    });

    expect(anchor.screenX).toBe(290);
    expect(anchor.screenY).toBe(138);
  });
});
