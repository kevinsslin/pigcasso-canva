import { describe, expect, test } from "bun:test";

import { hasLayoutOverlap, insertBlockAvoidingOverlap, layoutFromBlocks, normalizeBlocksLayout, resolveLayoutCollisions } from "@/features/spaces/lib/space-layout";
import type { SpaceBlock } from "@/features/spaces/lib/space-document";

const makeTextBlock = (id: string, layout: { x: number; y: number; w: number; h: number }): SpaceBlock =>
  ({
    id,
    type: "text",
    isVisible: true,
    layout,
    data: {
      title: `Block ${id}`,
      body: `Body ${id}`,
    },
  }) as SpaceBlock;

describe("space layout helpers", () => {
  test("insertBlockAvoidingOverlap keeps layout collision-free", () => {
    const blocks = [
      makeTextBlock("a", { x: 0, y: 0, w: 2, h: 1 }),
      makeTextBlock("b", { x: 2, y: 0, w: 2, h: 1 }),
    ];

    const inserted = makeTextBlock("c", { x: 0, y: 0, w: 2, h: 1 });
    const nextBlocks = insertBlockAvoidingOverlap(blocks, inserted, 4);

    expect(nextBlocks.map((b) => b.id).sort()).toEqual(["a", "b", "c"]);
    expect(hasLayoutOverlap(layoutFromBlocks(nextBlocks))).toBe(false);
  });

  test("normalizeBlocksLayout resolves overlaps while preserving stable items", () => {
    const blocks = [
      makeTextBlock("a", { x: 0, y: 0, w: 2, h: 1 }),
      makeTextBlock("b", { x: 2, y: 0, w: 2, h: 1 }),
      makeTextBlock("c", { x: 0, y: 0, w: 2, h: 1 }),
    ];

    const next = normalizeBlocksLayout(blocks, 4);
    expect(hasLayoutOverlap(layoutFromBlocks(next))).toBe(false);

    const byId = new Map(next.map((block) => [block.id, block.layout]));
    expect(byId.get("a")).toEqual({ x: 0, y: 0, w: 2, h: 1 });
    expect(byId.get("b")).toEqual({ x: 2, y: 0, w: 2, h: 1 });
    expect(byId.get("c")).toEqual({ x: 0, y: 1, w: 2, h: 1 });
  });

  test("resolveLayoutCollisions resolves overlapping layout items", () => {
    const layout = [
      { i: "a", x: 0, y: 0, w: 2, h: 1 },
      { i: "b", x: 0, y: 0, w: 2, h: 1 },
    ];

    expect(hasLayoutOverlap(layout)).toBe(true);
    const next = resolveLayoutCollisions(layout, 4);

    expect(next.map((item) => item.i).sort()).toEqual(["a", "b"]);
    expect(hasLayoutOverlap(next)).toBe(false);

    for (const item of next) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.w).toBeGreaterThanOrEqual(1);
      expect(item.h).toBeGreaterThanOrEqual(1);
      expect(item.x + item.w).toBeLessThanOrEqual(4);
    }
  });

  test("normalizeBlocksLayout preserves a valid layout by default", () => {
    const blocks = [
      makeTextBlock("a", { x: 0, y: 0, w: 1, h: 1 }),
      makeTextBlock("b", { x: 3, y: 2, w: 1, h: 1 }),
    ];

    const next = normalizeBlocksLayout(blocks, 4);
    expect(hasLayoutOverlap(layoutFromBlocks(next))).toBe(false);

    const byId = new Map(next.map((block) => [block.id, block.layout]));
    expect(byId.get("a")).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(byId.get("b")).toEqual({ x: 3, y: 2, w: 1, h: 1 });
  });

  test("normalizeBlocksLayout compacts when compact option is enabled", () => {
    const blocks = [
      makeTextBlock("a", { x: 0, y: 0, w: 1, h: 1 }),
      makeTextBlock("b", { x: 3, y: 2, w: 1, h: 1 }),
    ];

    const next = normalizeBlocksLayout(blocks, 4, { compact: true });
    expect(hasLayoutOverlap(layoutFromBlocks(next))).toBe(false);

    const byId = new Map(next.map((block) => [block.id, block.layout]));
    expect(byId.get("a")).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(byId.get("b")).toEqual({ x: 3, y: 0, w: 1, h: 1 });
  });
});
