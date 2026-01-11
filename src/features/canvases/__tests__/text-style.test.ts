/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getCanvasTextSizePx, pickCanvasTextSizeAndScaleFromPx } from "../lib/text-style";

describe("text-style helpers", () => {
  test("picks expected base sizes for exact matches", () => {
    expect(pickCanvasTextSizeAndScaleFromPx(18)).toEqual({ size: "s", scale: 1 });
    expect(pickCanvasTextSizeAndScaleFromPx(24)).toEqual({ size: "m", scale: 1 });
    expect(pickCanvasTextSizeAndScaleFromPx(36)).toEqual({ size: "l", scale: 1 });
    expect(pickCanvasTextSizeAndScaleFromPx(44)).toEqual({ size: "xl", scale: 1 });
  });

  test("returns defaults for invalid inputs", () => {
    expect(pickCanvasTextSizeAndScaleFromPx(Number.NaN)).toEqual({ size: "m", scale: 1 });
    expect(pickCanvasTextSizeAndScaleFromPx(0)).toEqual({ size: "m", scale: 1 });
    expect(pickCanvasTextSizeAndScaleFromPx(-10)).toEqual({ size: "m", scale: 1 });
  });

  test("round-trips common pixel sizes", () => {
    const input = 128;
    const { size, scale } = pickCanvasTextSizeAndScaleFromPx(input);
    expect(getCanvasTextSizePx(size, scale)).toBe(input);
  });

  test("clamps extremely large sizes", () => {
    const result = pickCanvasTextSizeAndScaleFromPx(100_000);
    expect(result.size).toBe("xl");
    expect(result.scale).toBe(100);
  });
});

