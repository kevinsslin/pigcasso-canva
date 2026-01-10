/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  parseNanoBananaProfileOption,
  toNanoBananaApiProfile,
} from "@/features/ai/lib/nano-banana-profile";

describe("nano banana profile helpers", () => {
  test("parseNanoBananaProfileOption accepts known values", () => {
    expect(parseNanoBananaProfileOption("auto")).toBe("auto");
    expect(parseNanoBananaProfileOption("nano-banana")).toBe("nano-banana");
    expect(parseNanoBananaProfileOption("nano-banana-pro")).toBe("nano-banana-pro");
  });

  test("parseNanoBananaProfileOption returns null for unknown values", () => {
    expect(parseNanoBananaProfileOption("")).toBeNull();
    expect(parseNanoBananaProfileOption("other")).toBeNull();
  });

  test("toNanoBananaApiProfile maps auto to undefined", () => {
    expect(toNanoBananaApiProfile("auto")).toBeUndefined();
    expect(toNanoBananaApiProfile("nano-banana")).toBe("nano-banana");
  });
});

