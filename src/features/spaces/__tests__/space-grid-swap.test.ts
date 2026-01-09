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
      swapOrigin: { x: 0, y: 0 },
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
      swapOrigin: { x: 0, y: 1 },
      lastSwappedWith: null,
    });

    expect(result.swappedWith).toBe("a");
    expect(result.layout.find((item) => item.i === "b")).toMatchObject({ x: 0, y: 0 });
    expect(result.layout.find((item) => item.i === "a")).toMatchObject({ x: 0, y: 1 });
  });

  test("swaps into the most recent slot when dragging across multiple items", () => {
    const initial: Layout = [
      { i: "a", x: 0, y: 0, w: 1, h: 1 },
      { i: "b", x: 0, y: 1, w: 1, h: 1 },
      { i: "c", x: 0, y: 2, w: 1, h: 1 },
    ];

    const step1Layout: Layout = [
      { i: "a", x: 0, y: 1, w: 1, h: 1 },
      { i: "b", x: 0, y: 1, w: 1, h: 1 },
      { i: "c", x: 0, y: 2, w: 1, h: 1 },
    ];

    const step1 = applySpaceGridDragSwap({
      layout: step1Layout,
      oldItem: { i: "a", x: 0, y: 0, w: 1, h: 1 },
      newItem: { i: "a", x: 0, y: 1, w: 1, h: 1 },
      swapOrigin: initial.find((item) => item.i === "a") ?? null,
      lastSwappedWith: null,
    });

    expect(step1.swappedWith).toBe("b");
    expect(step1.layout.find((item) => item.i === "b")).toMatchObject({ x: 0, y: 0 });

    const step2Layout: Layout = [
      { i: "a", x: 0, y: 2, w: 1, h: 1 },
      { i: "b", x: 0, y: 0, w: 1, h: 1 },
      { i: "c", x: 0, y: 2, w: 1, h: 1 },
    ];

    const step2 = applySpaceGridDragSwap({
      layout: step2Layout,
      oldItem: { i: "a", x: 0, y: 0, w: 1, h: 1 },
      newItem: { i: "a", x: 0, y: 2, w: 1, h: 1 },
      swapOrigin: step1.layout.find((item) => item.i === "a") ?? null,
      lastSwappedWith: step1.swappedWith,
    });

    expect(step2.swappedWith).toBe("c");
    expect(step2.layout.find((item) => item.i === "a")).toMatchObject({ x: 0, y: 2 });
    expect(step2.layout.find((item) => item.i === "c")).toMatchObject({ x: 0, y: 1 });
    expect(step2.layout.find((item) => item.i === "b")).toMatchObject({ x: 0, y: 0 });
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
      swapOrigin: { x: 0, y: 0 },
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
      swapOrigin: { x: 0, y: 0 },
      lastSwappedWith: null,
    });

    expect(result.layout).toBe(layout);
    expect(result.swappedWith).toBeNull();
  });
});
