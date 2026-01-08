import { describe, expect, test } from "bun:test";

import type { Layout, LayoutItem } from "react-grid-layout";

import { applySpaceGridDragSwap } from "@/features/spaces/lib/space-grid-swap";

describe("applySpaceGridDragSwap", () => {
  test("swaps items when dragging down into overlap", () => {
    const layout: Layout = [
      { i: "a", x: 0, y: 1, w: 1, h: 1 },
      { i: "b", x: 0, y: 1, w: 1, h: 1 },
    ];

    const oldItem: LayoutItem = { i: "a", x: 0, y: 0, w: 1, h: 1 };
    const newItem: LayoutItem = { i: "a", x: 0, y: 1, w: 1, h: 1 };

    const result = applySpaceGridDragSwap({
      layout,
      oldItem,
      newItem,
      lastSwappedWith: null,
    });

    expect(result.swappedWith).toBe("b");
    expect(result.layout.find((item) => item.i === "a")).toMatchObject({ x: 0, y: 1 });
    expect(result.layout.find((item) => item.i === "b")).toMatchObject({ x: 0, y: 0 });
  });

  test("swaps items when dragging up into overlap", () => {
    const layout: Layout = [
      { i: "a", x: 0, y: 0, w: 1, h: 1 },
      { i: "b", x: 0, y: 0, w: 1, h: 1 },
    ];

    const oldItem: LayoutItem = { i: "b", x: 0, y: 1, w: 1, h: 1 };
    const newItem: LayoutItem = { i: "b", x: 0, y: 0, w: 1, h: 1 };

    const result = applySpaceGridDragSwap({
      layout,
      oldItem,
      newItem,
      lastSwappedWith: null,
    });

    expect(result.swappedWith).toBe("a");
    expect(result.layout.find((item) => item.i === "b")).toMatchObject({ x: 0, y: 0 });
    expect(result.layout.find((item) => item.i === "a")).toMatchObject({ x: 0, y: 1 });
  });

  test("does not repeatedly swap with the same target during a single overlap", () => {
    const layout: Layout = [
      { i: "a", x: 0, y: 1, w: 1, h: 1 },
      { i: "b", x: 0, y: 1, w: 1, h: 1 },
    ];

    const oldItem: LayoutItem = { i: "a", x: 0, y: 0, w: 1, h: 1 };
    const newItem: LayoutItem = { i: "a", x: 0, y: 1, w: 1, h: 1 };

    const result = applySpaceGridDragSwap({
      layout,
      oldItem,
      newItem,
      lastSwappedWith: "b",
    });

    expect(result.layout).toBe(layout);
    expect(result.swappedWith).toBe("b");
  });

  test("returns original layout when there is no overlap", () => {
    const layout: Layout = [
      { i: "a", x: 0, y: 0, w: 1, h: 1 },
      { i: "b", x: 0, y: 2, w: 1, h: 1 },
    ];

    const oldItem: LayoutItem = { i: "a", x: 0, y: 0, w: 1, h: 1 };
    const newItem: LayoutItem = { i: "a", x: 0, y: 1, w: 1, h: 1 };

    const result = applySpaceGridDragSwap({
      layout,
      oldItem,
      newItem,
      lastSwappedWith: null,
    });

    expect(result.layout).toBe(layout);
    expect(result.swappedWith).toBeNull();
  });
});

