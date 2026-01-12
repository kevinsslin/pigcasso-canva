/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  exportCanvasSelectionToPngDataUrl,
  exportCurrentCanvasPageToPngDataUrl,
  getCanvasExportShapeIdsForSelection,
} from "../tldraw/export-canvas-image";

describe("exportCurrentCanvasPageToPngDataUrl", () => {
  test("exports all current page shapes to a PNG data URL", async () => {
    const calls: Array<{ shapeIds: unknown[]; opts: Record<string, unknown> }> = [];

    const editor = {
      getCurrentPageShapes: () => [{ id: "shape:a" }, { id: "shape:b" }],
      getShapePageBounds: (shapeId: string) => {
        if (shapeId === "shape:a") return { x: 0, y: 0, w: 1200, h: 800 };
        return { x: 1200, y: 0, w: 200, h: 200 };
      },
      toImageDataUrl: async (shapeIds: unknown[], opts: Record<string, unknown>) => {
        calls.push({ shapeIds, opts });
        return { url: "data:image/png;base64,abc", width: 10, height: 10 };
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
      getShapePageBounds: () => ({ x: 0, y: 0, w: 1200, h: 800 }),
      toImageDataUrl: async () => ({ url: "data:image/png;base64,abc", width: 10, height: 10 }),
    } as any;

    await expect(exportCurrentCanvasPageToPngDataUrl(editor)).rejects.toThrow("No shapes");
  });
});

describe("getCanvasExportShapeIdsForSelection", () => {
  test("includes all shapes in the nearest frame", () => {
    const editor = {
      getShape: (id: string) => {
        if (id === "shape:frame") return { id, type: "frame", parentId: "page:one" };
        if (id === "shape:img") return { id, type: "image", parentId: "shape:frame" };
        if (id === "shape:txt") return { id, type: "text", parentId: "shape:frame" };
        return null;
      },
      getSortedChildIdsForParent: (id: string) => {
        if (id === "page:one") return ["shape:frame"];
        if (id === "shape:frame") return ["shape:img", "shape:txt"];
        return [];
      },
    } as any;

    expect(getCanvasExportShapeIdsForSelection(editor, "shape:img")).toEqual(["shape:img", "shape:txt"]);
  });
});

describe("exportCanvasSelectionToPngDataUrl", () => {
  test("exports a selection composite (uses toImageDataUrl.url)", async () => {
    const calls: Array<{ shapeIds: unknown[]; opts: Record<string, unknown> }> = [];

    const editor = {
      getShape: (id: string) => {
        if (id === "shape:frame") return { id, type: "frame", parentId: "page:one" };
        if (id === "shape:img") return { id, type: "image", parentId: "shape:frame" };
        if (id === "shape:txt") return { id, type: "text", parentId: "shape:frame" };
        return null;
      },
      getCurrentPageId: () => "page:one",
      getSortedChildIdsForParent: (id: string) => {
        if (id === "page:one") return ["shape:frame"];
        if (id === "shape:frame") return ["shape:img", "shape:txt"];
        return [];
      },
      getShapePageBounds: (id: string) => {
        if (id === "shape:img") return { x: 0, y: 0, w: 400, h: 300 };
        if (id === "shape:txt") return { x: 20, y: 20, w: 200, h: 80 };
        return { x: 0, y: 0, w: 1, h: 1 };
      },
      toImageDataUrl: async (shapeIds: unknown[], opts: Record<string, unknown>) => {
        calls.push({ shapeIds, opts });
        return { url: "data:image/png;base64,xyz", width: 10, height: 10 };
      },
    } as any;

    const dataUrl = await exportCanvasSelectionToPngDataUrl(editor, {
      shapeId: "shape:img",
      targetPx: 1024,
      padding: 16,
      pixelRatio: 1,
      background: false,
    });

    expect(dataUrl).toBe("data:image/png;base64,xyz");
    expect(calls).toHaveLength(1);
    expect(calls[0].shapeIds).toEqual(["shape:img", "shape:txt"]);
    expect(calls[0].opts.format).toBe("png");
    expect(calls[0].opts.padding).toBe(16);
    expect(calls[0].opts.pixelRatio).toBe(1);
    expect(calls[0].opts.background).toBe(false);
  });
});
