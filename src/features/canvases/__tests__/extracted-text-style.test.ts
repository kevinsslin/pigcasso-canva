/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  inferTextColorFromRegionPixels,
  pickFontFamilyPresetForExtractedText,
  pickNearestCanvasTextColor,
} from "@/features/canvases/lib/extracted-text-style";

describe("pickNearestCanvasTextColor", () => {
  test("maps near-white to white", () => {
    expect(pickNearestCanvasTextColor({ r: 245, g: 245, b: 245 })).toBe("white");
  });

  test("maps near-black to black", () => {
    expect(pickNearestCanvasTextColor({ r: 10, g: 10, b: 12 })).toBe("black");
  });

  test("maps a red-ish color to red", () => {
    expect(pickNearestCanvasTextColor({ r: 230, g: 60, b: 70 })).toBe("red");
  });
});

describe("inferTextColorFromRegionPixels", () => {
  test("picks the outlier (text) color for a simple region", () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // background: light grey
    for (let i = 0; i < width * height; i += 1) {
      const o = i * 4;
      pixels[o] = 220;
      pixels[o + 1] = 220;
      pixels[o + 2] = 220;
      pixels[o + 3] = 255;
    }

    // text: a red block in top-left quadrant
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        const o = (y * width + x) * 4;
        pixels[o] = 240;
        pixels[o + 1] = 60;
        pixels[o + 2] = 70;
        pixels[o + 3] = 255;
      }
    }

    const inferred = inferTextColorFromRegionPixels({
      pixels,
      width,
      height,
      region: { x: 0, y: 0, w: width, h: height },
    });

    expect(inferred.color).toBe("red");
    expect(inferred.confidence).toBeGreaterThan(0);
  });
});

describe("pickFontFamilyPresetForExtractedText", () => {
  test("uses TC preset when CJK characters are present", () => {
    const meta = pickFontFamilyPresetForExtractedText({ text: "你好世界", font: "sans" });
    expect(meta?.fontFamily).toContain("var(--font-tc)");
  });

  test("uses mono preset when font=mono", () => {
    const meta = pickFontFamilyPresetForExtractedText({ text: "hello", font: "mono" });
    expect(meta?.fontFamily).toContain("ui-monospace");
  });
});

