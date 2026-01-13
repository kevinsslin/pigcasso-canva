/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { compareOcrTextBlocks } from "@/features/canvases/lib/ocr-review";

describe("OCR fidelity review", () => {
  test("passes when all expected blocks are present", () => {
    const report = compareOcrTextBlocks({
      expected: [{ text: "BUILD YOUR FUTURE", box: { x: 0, y: 0, w: 1, h: 0.1 } }],
      actual: [{ text: "BUILD YOUR FUTURE", box: { x: 0, y: 0, w: 1, h: 0.1 } }],
    });

    expect(report.ok).toBe(true);
    expect(report.missing).toEqual([]);
    expect(report.matchedCount).toBe(1);
  });

  test("tolerates whitespace/punctuation differences", () => {
    const report = compareOcrTextBlocks({
      expected: [{ text: "Join  Now →", box: { x: 0, y: 0, w: 0.3, h: 0.1 } }],
      actual: [{ text: "JOIN NOW", box: { x: 0, y: 0, w: 0.3, h: 0.1 } }],
    });

    expect(report.ok).toBe(true);
    expect(report.matchedCount).toBe(1);
  });

  test("flags when many expected blocks are missing", () => {
    const report = compareOcrTextBlocks({
      expected: [
        { text: "BUILD YOUR FUTURE", box: { x: 0, y: 0, w: 1, h: 0.1 } },
        { text: "JOIN NOW", box: { x: 0, y: 0.8, w: 0.3, h: 0.1 } },
        { text: "SOME OTHER", box: { x: 0, y: 0.9, w: 0.4, h: 0.1 } },
        { text: "FOOTER", box: { x: 0, y: 0.95, w: 0.4, h: 0.1 } },
      ],
      actual: [{ text: "BUILD YOUR FUTURE", box: { x: 0, y: 0, w: 1, h: 0.1 } }],
      options: { allowMissingRatio: 0.25 },
    });

    expect(report.ok).toBe(false);
    expect(report.missing.length).toBeGreaterThanOrEqual(2);
  });
});

