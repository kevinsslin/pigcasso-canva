/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("CanvasSelectionToolbar font picker (regression)", () => {
  test("does not use confusing 'Default …' labels", () => {
    const content = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "canvas-selection-toolbar.tsx",
      ),
      "utf8",
    );

    expect(content).not.toContain("Default {opt.label}");
    expect(content).toContain("Built-in");
    expect(content).toContain("Recommended");
  });

  test("custom font selection is not a no-op", () => {
    const content = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "canvas-selection-toolbar.tsx",
      ),
      "utf8",
    );

    expect(content).not.toContain("if (value === \"__custom__\") return");
  });
});

