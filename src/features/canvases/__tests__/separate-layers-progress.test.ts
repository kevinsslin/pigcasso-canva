/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Separate layers progress (regression)", () => {
  test("does not create a stuck toast with a mismatched id", () => {
    const content = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "hooks",
        "use-canvas-selected-image-actions.ts",
      ),
      "utf8",
    );

    expect(content).not.toContain('toast.loading("Extracting text');
    expect(content).not.toContain('toast.loading("Cutting out subject');
    expect(content).not.toContain('toast.loading("Generating background');
    expect(content).not.toContain("if (!queue) return;");
    expect(content).toContain("updateAiUiJobLabel(uiJobId");
    expect(content).toContain("setLabel(\"Analyzing text & layout…\")");
  });
});

