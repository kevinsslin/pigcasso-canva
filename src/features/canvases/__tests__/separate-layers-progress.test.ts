/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Separate layers progress (regression)", () => {
  test("keeps progress handling centralized in the AI queue + job label updates", () => {
    const hookContent = readFileSync(
      join(process.cwd(), "src", "features", "canvases", "screens", "canvas-screen", "hooks", "use-canvas-selected-image-actions.ts"),
      "utf8",
    );

    expect(hookContent).not.toContain('toast.loading("Extracting text');
    expect(hookContent).not.toContain('toast.loading("Cutting out subject');
    expect(hookContent).not.toContain('toast.loading("Generating background');
    expect(hookContent).not.toContain("if (!queue) return;");
    expect(hookContent).toContain("updateAiUiJobLabel(uiJobId");

    const workflowContent = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "hooks",
        "selected-image-actions",
        "run-separate-layers-selected-image.ts",
      ),
      "utf8",
    );
    expect(workflowContent).toContain('setLabel("Analyzing text & layout…")');
    expect(workflowContent).toContain("bringToFront?.([cutoutInserted.shapeId]");
    expect(workflowContent).toContain("bringToFront?.(createdTextShapeIds");
  });
});
