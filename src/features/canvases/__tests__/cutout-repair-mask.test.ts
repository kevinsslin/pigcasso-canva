/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { closeBinaryMask, fillBinaryMaskHoles, getBinaryMaskBoundingBox } from "@/features/canvases/lib/transparent-png";

const maskFromRows = (rows: string[]) => {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const data = new Uint8Array(width * height);
  rows.forEach((row, y) => {
    row.split("").forEach((ch, x) => {
      data[y * width + x] = ch === "1" ? 1 : 0;
    });
  });
  return { data, width, height };
};

describe("Cutout repair mask helpers", () => {
  test("fillBinaryMaskHoles fills enclosed holes", () => {
    const { data, width, height } = maskFromRows([
      "00000",
      "01110",
      "01010",
      "01110",
      "00000",
    ]);

    const result = fillBinaryMaskHoles(data, width, height);
    expect(result.filled).toBe(1);
    expect(result.mask[2 * width + 2]).toBe(1);
  });

  test("closeBinaryMask helps seal narrow gaps before filling", () => {
    const { data, width, height } = maskFromRows([
      "0000000",
      "0111010",
      "0100010",
      "0100010",
      "0100010",
      "0111110",
      "0000000",
    ]);

    // Center is connected to the outside through the gap, so hole-fill alone should NOT fill it.
    const holeOnly = fillBinaryMaskHoles(data, width, height);
    expect(holeOnly.mask[3 * width + 3]).toBe(0);

    const closed = closeBinaryMask(data, width, height, 1);
    const after = fillBinaryMaskHoles(closed, width, height);
    expect(after.mask[3 * width + 3]).toBe(1);
    expect(after.filled).toBeGreaterThan(0);
  });

  test("getBinaryMaskBoundingBox returns bounds", () => {
    const { data, width, height } = maskFromRows([
      "00000",
      "00100",
      "00100",
      "00000",
      "00000",
    ]);

    const box = getBinaryMaskBoundingBox(data, width, height);
    expect(box).toEqual({ minX: 2, minY: 1, maxX: 2, maxY: 2 });
  });
});

