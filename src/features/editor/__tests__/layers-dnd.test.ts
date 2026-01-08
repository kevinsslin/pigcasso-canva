/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { applyLayerOrderToCanvas, swapLayerIds } from "@/features/editor/layers-dnd";

describe("swapLayerIds", () => {
  test("swaps adjacent items", () => {
    const order = ["d", "c", "b", "a"];
    expect(swapLayerIds(order, "d", "c")).toEqual(["c", "d", "b", "a"]);
  });

  test("swaps non-adjacent items", () => {
    const order = ["d", "c", "b", "a"];
    expect(swapLayerIds(order, "d", "a")).toEqual(["a", "c", "b", "d"]);
  });

  test("dragging top down swaps step-by-step", () => {
    const order = ["d", "c", "b", "a"];

    const step1 = swapLayerIds(order, "d", "c");
    const step2 = swapLayerIds(step1, "d", "b");
    const step3 = swapLayerIds(step2, "d", "a");

    expect(step3).toEqual(["c", "b", "a", "d"]);
  });

  test("unknown ids are a no-op", () => {
    const order = ["a", "b", "c"];
    expect(swapLayerIds(order, "missing", "b")).toBe(order);
  });
});

type MockObject = {
  name?: string | null;
  __pigcassoLayerId?: string;
};

class MockCanvas {
  objects: MockObject[];
  activeObject: MockObject | null = null;
  firedEvents: string[] = [];

  constructor(objects: MockObject[]) {
    this.objects = objects;
  }

  getObjects = () => this.objects;

  moveTo = (object: MockObject, index: number) => {
    const currentIndex = this.objects.indexOf(object);
    if (currentIndex < 0) return;
    this.objects.splice(currentIndex, 1);
    this.objects.splice(index, 0, object);
  };

  setActiveObject = (object: MockObject) => {
    this.activeObject = object;
  };

  requestRenderAll = () => {};

  fire = (eventName: string) => {
    this.firedEvents.push(eventName);
  };
};

describe("applyLayerOrderToCanvas", () => {
  test("applies top-to-bottom layer order to canvas stacking", () => {
    const clip = { name: "clip", __pigcassoLayerId: "clip" };
    const a = { name: "rect", __pigcassoLayerId: "a" };
    const b = { name: "rect", __pigcassoLayerId: "b" };
    const c = { name: "rect", __pigcassoLayerId: "c" };
    const d = { name: "rect", __pigcassoLayerId: "d" };

    const canvas = new MockCanvas([clip, a, b, c, d]);

    applyLayerOrderToCanvas(canvas, ["c", "b", "a", "d"], { activeId: "d" });

    expect(canvas.objects.map((o) => o.__pigcassoLayerId)).toEqual([
      "clip",
      "d",
      "a",
      "b",
      "c",
    ]);
    expect(canvas.activeObject?.__pigcassoLayerId).toBe("d");
    expect(canvas.firedEvents).toContain("object:modified");
  });
});
