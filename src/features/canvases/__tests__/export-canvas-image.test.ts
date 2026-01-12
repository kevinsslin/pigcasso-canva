/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { exportCurrentCanvasPageToPngDataUrl } from "../tldraw/export-canvas-image";

describe("exportCurrentCanvasPageToPngDataUrl", () => {
  test("exports all current page shapes to a PNG data URL", async () => {
    const calls: Array<{ shapeIds: unknown[]; opts: Record<string, unknown> }> = [];

    const editor = {
      getCurrentPageShapes: () => [{ id: "shape:a" }, { id: "shape:b" }],
      getCurrentPageBounds: () => ({ w: 1200, h: 800 }),
      toImageDataUrl: async (shapeIds: unknown[], opts: Record<string, unknown>) => {
        calls.push({ shapeIds, opts });
        return "data:image/png;base64,abc";
      },
    } as any;

    const dataUrl = await exportCurrentCanvasPageToPngDataUrl(editor, {
      targetPx: 2048,
      padding: 32,
      pixelRatio: 2,
    });

    expect(dataUrl).toBe("data:image/png;base64,abc");
    expect(calls).toHaveLength(1);
    expect(calls[0].shapeIds).toEqual(["shape:a", "shape:b"]);
    expect(calls[0].opts.format).toBe("png");
    expect(calls[0].opts.background).toBe(true);
    expect(calls[0].opts.padding).toBe(32);
    expect(calls[0].opts.pixelRatio).toBe(2);
  });

  test("throws when the canvas has no shapes", async () => {
    const editor = {
      getCurrentPageShapes: () => [],
      getCurrentPageBounds: () => ({ w: 1200, h: 800 }),
      toImageDataUrl: async () => "data:image/png;base64,abc",
    } as any;

    await expect(exportCurrentCanvasPageToPngDataUrl(editor)).rejects.toThrow("No shapes");
  });
});

