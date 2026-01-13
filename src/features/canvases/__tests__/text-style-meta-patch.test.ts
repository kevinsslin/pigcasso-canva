/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildTextFontFamilyMetaPatch, PIGCASSO_TEXT_FONT_FAMILY_META_KEY } from "@/features/canvases/lib/text-style";

describe("Text style meta patches", () => {
  test("clearing font family sets meta key to undefined (so tldraw merge removes effect)", () => {
    const patch = buildTextFontFamilyMetaPatch(null) as any;
    expect(Object.prototype.hasOwnProperty.call(patch, PIGCASSO_TEXT_FONT_FAMILY_META_KEY)).toBe(true);
    expect(patch[PIGCASSO_TEXT_FONT_FAMILY_META_KEY]).toBeUndefined();
  });

  test("setting font family trims and sets meta key", () => {
    const patch = buildTextFontFamilyMetaPatch('  ui-sans-serif, system-ui  ') as any;
    expect(patch[PIGCASSO_TEXT_FONT_FAMILY_META_KEY]).toBe("ui-sans-serif, system-ui");
  });
});

