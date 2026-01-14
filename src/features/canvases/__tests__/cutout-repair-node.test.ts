/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { repairTransparentCutoutDataUrl } from "@/features/canvases/lib/transparent-png";

describe("repairTransparentCutoutDataUrl (node fallback)", () => {
  test("returns unchanged when document is unavailable", async () => {
    const input = "data:image/png;base64,AAA=";
    const result = await repairTransparentCutoutDataUrl({ cutoutDataUrl: input });
    expect(result.dataUrl).toBe(input);
    expect(result.changed).toBe(false);
  });
});

