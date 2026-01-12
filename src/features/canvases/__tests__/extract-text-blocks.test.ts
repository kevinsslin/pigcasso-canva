/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { filterProminentTextBlocks } from "@/features/canvases/lib/extract-text-blocks";
import type { ExtractTextBlock } from "@/features/ai/api/use-extract-text";

const block = (partial: Partial<ExtractTextBlock>): ExtractTextBlock => ({
  text: "Hello",
  box: { x: 0.1, y: 0.1, w: 0.2, h: 0.08 },
  ...partial,
});

describe("filterProminentTextBlocks", () => {
  test("drops tiny text blocks and keeps prominent ones", () => {
    const blocks = [
      block({ text: "BIG", box: { x: 0.05, y: 0.1, w: 0.6, h: 0.12 } }),
      block({ text: "tiny", box: { x: 0.1, y: 0.8, w: 0.08, h: 0.012 } }),
      block({ text: "small", box: { x: 0.1, y: 0.82, w: 0.12, h: 0.016 } }),
      block({ text: "MID", box: { x: 0.1, y: 0.3, w: 0.35, h: 0.06 } }),
    ];

    const filtered = filterProminentTextBlocks(blocks, {
      imageWidth: 1024,
      imageHeight: 1024,
      minHeightPx: 20,
      maxBlocks: 16,
    });

    expect(filtered.map((b) => b.text)).toEqual(["BIG", "MID"]);
  });

  test("returns [] when blocks have invalid boxes or blank text", () => {
    const filtered = filterProminentTextBlocks(
      [
        block({ text: "   " }),
        block({ box: { x: Number.NaN as any, y: 0, w: 0.2, h: 0.1 } as any }),
      ],
      { imageWidth: 1024, imageHeight: 1024 },
    );

    expect(filtered).toEqual([]);
  });
});

