/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";

describe("tldraw insertImageToCanvas", () => {
  test("creates an image asset + shape and selects it", async () => {
    const calls: { assets: any[]; shapes: any[]; selected: any[] } = {
      assets: [],
      shapes: [],
      selected: [],
    };

    const editor = {
      createAssets: (assets: any[]) => {
        calls.assets.push(...assets);
        return editor;
      },
      createShapes: (shapes: any[]) => {
        calls.shapes.push(...shapes);
        return editor;
      },
      select: (...ids: any[]) => {
        calls.selected.push(ids);
        return editor;
      },
    };

    const point = { x: 200, y: 300 };
    const src = "https://example.com/pig.png";

    const result = await insertImageToCanvas(editor, {
      src,
      point,
      name: "Pig.png",
      size: { w: 2000, h: 1000 },
      maxShapeDimension: 500,
    });

    expect(result.assetId).toStartWith("asset:");
    expect(result.shapeId).toStartWith("shape:");
    expect(calls.assets).toHaveLength(1);
    expect(calls.shapes).toHaveLength(1);
    expect(calls.selected).toEqual([[result.shapeId]]);

    const asset = calls.assets[0];
    expect(asset.typeName).toBe("asset");
    expect(asset.type).toBe("image");
    expect(asset.props.src).toBe(src);
    expect(asset.props.w).toBe(2000);
    expect(asset.props.h).toBe(1000);

    const shape = calls.shapes[0];
    expect(shape.type).toBe("image");
    expect(shape.props.assetId).toBe(result.assetId);
    expect(shape.props.w).toBe(500);
    expect(shape.props.h).toBe(250);
    expect(shape.x).toBe(point.x - 500 / 2);
    expect(shape.y).toBe(point.y - 250 / 2);
  });
});

