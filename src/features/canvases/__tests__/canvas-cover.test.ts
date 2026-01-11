import { describe, expect, test } from "bun:test";

import { getCanvasCoverScale } from "@/features/canvases/lib/canvas-cover";

describe("getCanvasCoverScale", () => {
  test("returns 1 for small boards", () => {
    expect(getCanvasCoverScale({ w: 600, h: 400 }, { targetPx: 720 })).toBe(1);
  });

  test("downscales large boards to targetPx", () => {
    expect(getCanvasCoverScale({ w: 10_000, h: 1_000 }, { targetPx: 720 })).toBeCloseTo(0.072);
  });

  test("respects min/max scale clamps", () => {
    expect(getCanvasCoverScale({ w: 100_000, h: 100_000 }, { targetPx: 1, minScale: 0.05 })).toBe(0.05);
    expect(getCanvasCoverScale({ w: 10, h: 10 }, { targetPx: 2000, maxScale: 0.9 })).toBe(0.9);
  });
});

