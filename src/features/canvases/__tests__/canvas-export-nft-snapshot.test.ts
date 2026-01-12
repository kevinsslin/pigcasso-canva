/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Canvas Export NFT (regression)", () => {
  test("exports a canvas-rendered PNG (not just the base image asset)", () => {
    const content = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "canvas-screen.tsx",
      ),
      "utf8",
    );

    expect(content).toContain("exportCanvasSelectionToPngDataUrl");
    expect(content).toContain("uploadImageDataUrl");
    expect(content).toContain("pigcasso_canvas_");
  });
});
