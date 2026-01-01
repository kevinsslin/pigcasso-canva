import { describe, expect, test } from "bun:test";

import { pickGeminiAspectRatio } from "@/server/gemini-image-config";

describe("pickGeminiAspectRatio", () => {
  test("maps common canvas sizes to supported ratios", () => {
    expect(pickGeminiAspectRatio({ width: 1920, height: 1080 })).toBe("16:9");
    expect(pickGeminiAspectRatio({ width: 1080, height: 1920 })).toBe("9:16");
    expect(pickGeminiAspectRatio({ width: 1000, height: 1000 })).toBe("1:1");
  });

  test("picks the nearest supported ratio", () => {
    expect(pickGeminiAspectRatio({ width: 500, height: 400 })).toBe("4:3"); // 5:4 → 4:3
    expect(pickGeminiAspectRatio({ width: 400, height: 500 })).toBe("3:4"); // 4:5 → 3:4
  });

  test("returns undefined for invalid sizes", () => {
    expect(pickGeminiAspectRatio(undefined)).toBeUndefined();
    expect(pickGeminiAspectRatio({ width: 0, height: 100 })).toBeUndefined();
    expect(pickGeminiAspectRatio({ width: 100, height: 0 })).toBeUndefined();
    expect(pickGeminiAspectRatio({ width: Number.NaN, height: 100 })).toBeUndefined();
  });
});

