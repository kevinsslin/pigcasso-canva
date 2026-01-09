import { describe, expect, test } from "bun:test";

import { getTabAnchor } from "../tldraw/tab-anchor";

describe("getTabAnchor", () => {
  test("returns page point and shape id when hit-testing succeeds", () => {
    const anchor = getTabAnchor(
      {
        screenToPage: (point) => ({ x: point.x / 2, y: point.y / 2 }),
        getShapeAtPoint: () => ({ id: "shape:123" }),
      },
      { x: 40, y: 60 },
    );

    expect(anchor).toEqual({
      screenPoint: { x: 40, y: 60 },
      pagePoint: { x: 20, y: 30 },
      shapeId: "shape:123",
    });
  });

  test("returns null shape id when no shape is hit", () => {
    const anchor = getTabAnchor(
      {
        screenToPage: () => ({ x: 1, y: 2 }),
        getShapeAtPoint: () => undefined,
      },
      { x: 10, y: 20 },
    );

    expect(anchor.shapeId).toBe(null);
    expect(anchor.pagePoint).toEqual({ x: 1, y: 2 });
  });
});

