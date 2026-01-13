/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { computeScrollProgress, computeStepMix } from "@/features/marketing/lib/scroll-progress";

describe("scroll progress helpers", () => {
  test("computeScrollProgress clamps and returns 0 when not scrollable", () => {
    expect(computeScrollProgress({ rectTop: 0, rectHeight: 800, viewportHeight: 900 })).toBe(0);
    expect(computeScrollProgress({ rectTop: 0, rectHeight: 0, viewportHeight: 900 })).toBe(0);
    expect(computeScrollProgress({ rectTop: 0, rectHeight: 900, viewportHeight: 0 })).toBe(0);
  });

  test("computeScrollProgress maps element scroll to 0..1", () => {
    // element height 2000, viewport 1000 => scrollable 1000
    expect(computeScrollProgress({ rectTop: 0, rectHeight: 2000, viewportHeight: 1000 })).toBe(0);
    expect(computeScrollProgress({ rectTop: -500, rectHeight: 2000, viewportHeight: 1000 })).toBe(0.5);
    expect(computeScrollProgress({ rectTop: -1200, rectHeight: 2000, viewportHeight: 1000 })).toBe(1);
  });

  test("computeStepMix returns active index and mix", () => {
    expect(computeStepMix(0, 4)).toEqual({ index: 0, mix: 0 });
    expect(computeStepMix(1, 4)).toEqual({ index: 3, mix: 0 });
    expect(computeStepMix(0.5, 4)).toEqual({ index: 1, mix: 0.5 });
  });
});

