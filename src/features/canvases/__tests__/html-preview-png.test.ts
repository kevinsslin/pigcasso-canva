/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("HTML preview (regression)", () => {
  test("renders previews as PNG (avoids black JPEG backgrounds)", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "features", "canvases", "lib", "html-preview.ts"),
      "utf8",
    );

    expect(content).toContain("image/png");
    expect(content).not.toContain("image/jpeg");
  });
});

