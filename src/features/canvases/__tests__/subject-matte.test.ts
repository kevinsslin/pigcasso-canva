/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { computeSubjectMatteFromPixels } from "@/features/canvases/lib/subject-matte";

const makeImage = (width: number, height: number, fill: { r: number; g: number; b: number; a: number }) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 4;
    data[o] = fill.r;
    data[o + 1] = fill.g;
    data[o + 2] = fill.b;
    data[o + 3] = fill.a;
  }
  return data;
};

describe("computeSubjectMatteFromPixels", () => {
  test("makes pixels transparent when foreground ~= background", () => {
    const width = 4;
    const height = 4;
    const bg = makeImage(width, height, { r: 200, g: 200, b: 200, a: 255 });
    const fg = new Uint8ClampedArray(bg);

    // Add a 2x2 subject in the center
    for (let y = 1; y <= 2; y += 1) {
      for (let x = 1; x <= 2; x += 1) {
        const idx = y * width + x;
        const o = idx * 4;
        fg[o] = 40;
        fg[o + 1] = 120;
        fg[o + 2] = 200;
        fg[o + 3] = 255;
      }
    }

    const matte = computeSubjectMatteFromPixels({ foreground: fg, background: bg, width, height });
    expect(matte.changed).toBe(true);
    expect(matte.opaqueRatio).toBeGreaterThan(0);

    const alphaAt = (x: number, y: number) => matte.data[(y * width + x) * 4 + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(3, 3)).toBe(0);
    expect(alphaAt(1, 1)).toBeGreaterThan(0);
    expect(alphaAt(2, 2)).toBeGreaterThan(0);
  });
});

