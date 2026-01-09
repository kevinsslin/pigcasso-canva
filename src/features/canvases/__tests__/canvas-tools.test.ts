import { describe, expect, test } from "bun:test";

import { fromTldrawToolId, toTldrawToolId } from "@/features/canvases/lib/canvas-tools";

describe("canvas tools helpers", () => {
  test("toTldrawToolId maps tools to tldraw ids", () => {
    expect(toTldrawToolId("select")).toBe("select");
    expect(toTldrawToolId("hand")).toBe("hand");
    expect(toTldrawToolId("draw")).toBe("draw");
    expect(toTldrawToolId("text")).toBe("text");
    expect(toTldrawToolId("frame")).toBe("frame");
  });

  test("fromTldrawToolId maps tldraw ids to tools", () => {
    expect(fromTldrawToolId("select")).toBe("select");
    expect(fromTldrawToolId("select.dragging")).toBe("select");
    expect(fromTldrawToolId("hand")).toBe("hand");
    expect(fromTldrawToolId("draw")).toBe("draw");
    expect(fromTldrawToolId("text")).toBe("text");
    expect(fromTldrawToolId("frame")).toBe("frame");
    expect(fromTldrawToolId("geo")).toBe(null);
  });
});
