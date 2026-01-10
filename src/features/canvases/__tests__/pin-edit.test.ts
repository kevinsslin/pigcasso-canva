import { describe, expect, test } from "bun:test";

import { getPinEditTrigger, isClickWithinThreshold } from "@/features/canvases/lib/pin-edit";

describe("pin edit helpers", () => {
  test("prefers alt trigger over armed", () => {
    expect(getPinEditTrigger({ altKey: true, armed: true })).toBe("alt");
  });

  test("returns pin trigger when armed", () => {
    expect(getPinEditTrigger({ altKey: false, armed: true })).toBe("pin");
  });

  test("returns null when neither alt nor armed", () => {
    expect(getPinEditTrigger({ altKey: false, armed: false })).toBeNull();
  });

  test("click threshold defaults to 6", () => {
    expect(isClickWithinThreshold({ dx: 3, dy: 4 })).toBe(true);
    expect(isClickWithinThreshold({ dx: 6, dy: 0 })).toBe(true);
    expect(isClickWithinThreshold({ dx: 7, dy: 0 })).toBe(false);
  });
});

