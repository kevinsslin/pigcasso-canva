/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("HTML preview pipeline (regression)", () => {
  test("loads html2canvas from same-origin instead of a CDN", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "features", "canvases", "lib", "html-preview.ts"),
      "utf8",
    );

    expect(content).toContain('"/vendor/html2canvas.min.js"');
    expect(content).not.toContain("cdn.jsdelivr.net");
  });

  test("includes vendored html2canvas script", () => {
    const content = readFileSync(
      join(process.cwd(), "public", "vendor", "html2canvas.min.js"),
      "utf8",
    );

    expect(content).toContain("html2canvas");
  });
});

