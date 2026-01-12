/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { hasAnyTransparency, stripFakeTransparencyGrid } from "@/features/canvases/lib/transparent-png";

const rgb = (r: number, g: number, b: number) => ({ r, g, b, a: 255 });

const makeRgba = (width: number, height: number, fill: { r: number; g: number; b: number; a: number }) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill.r;
    data[i * 4 + 1] = fill.g;
    data[i * 4 + 2] = fill.b;
    data[i * 4 + 3] = fill.a;
  }
  return data;
};

describe("transparent PNG helpers", () => {
  test("hasAnyTransparency detects alpha < 255", () => {
    const data = makeRgba(2, 2, rgb(255, 255, 255));
    expect(hasAnyTransparency(data)).toBe(false);
    data[3] = 0;
    expect(hasAnyTransparency(data)).toBe(true);
  });

  test("stripFakeTransparencyGrid converts a checkerboard background into alpha=0", () => {
    const width = 6;
    const height = 6;
    const light = rgb(235, 235, 235);
    const dark = rgb(205, 205, 205);
    const subject = rgb(220, 120, 60);

    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const cell = (x + y) % 2 === 0 ? light : dark;
        data[idx * 4] = cell.r;
        data[idx * 4 + 1] = cell.g;
        data[idx * 4 + 2] = cell.b;
        data[idx * 4 + 3] = 255;
      }
    }

    for (let y = 2; y <= 3; y++) {
      for (let x = 2; x <= 3; x++) {
        const idx = y * width + x;
        data[idx * 4] = subject.r;
        data[idx * 4 + 1] = subject.g;
        data[idx * 4 + 2] = subject.b;
        data[idx * 4 + 3] = 255;
      }
    }

    const result = stripFakeTransparencyGrid({ data, width, height });
    expect(result.changed).toBe(true);

    const alphaAt = (x: number, y: number) => result.data[(y * width + x) * 4 + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(5, 5)).toBe(0);
    expect(alphaAt(2, 2)).toBe(255);
    expect(alphaAt(3, 3)).toBe(255);
  });

  test("stripFakeTransparencyGrid is a no-op when the input already has transparency", () => {
    const width = 4;
    const height = 4;
    const data = makeRgba(width, height, rgb(230, 230, 230));
    data[3] = 0;

    const result = stripFakeTransparencyGrid({ data, width, height });
    expect(result.changed).toBe(false);
    expect(result.data).toBe(data);
  });
});

