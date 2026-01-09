import { describe, expect, test } from "bun:test";

import { getAiInsertPoint } from "../tldraw/insert-point";

describe("getAiInsertPoint", () => {
  test("uses cursor point when it is inside viewport", () => {
    expect(
      getAiInsertPoint({
        inputs: { currentPagePoint: { x: 50, y: 60 } },
        getViewportPageBounds: () => ({ x: 0, y: 0, w: 200, h: 200 }),
      }),
    ).toEqual({ x: 50, y: 60 });
  });

  test("falls back to viewport center when cursor is missing", () => {
    expect(
      getAiInsertPoint({
        inputs: { currentPagePoint: null },
        getViewportPageBounds: () => ({ x: 10, y: 20, w: 100, h: 200 }),
      }),
    ).toEqual({ x: 60, y: 120 });
  });

  test("falls back to viewport center when cursor is outside viewport", () => {
    expect(
      getAiInsertPoint({
        inputs: { currentPagePoint: { x: -999, y: 0 } },
        getViewportPageBounds: () => ({ x: 0, y: 0, w: 200, h: 200 }),
      }),
    ).toEqual({ x: 100, y: 100 });
  });
});

