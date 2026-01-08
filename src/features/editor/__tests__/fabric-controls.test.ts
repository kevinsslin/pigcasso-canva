/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { applyCanvaLikeResizeControls } from "@/features/editor/fabric-controls";

class MockControl {
  [key: string]: unknown;
  constructor(options: Record<string, unknown>) {
    Object.assign(this, options);
  }
}

describe("applyCanvaLikeResizeControls", () => {
  test("configures object edge controls for resize", () => {
    const fabric = {
      Control: MockControl,
      Object: {
        prototype: {
          controls: {
            ml: new MockControl({}),
            mr: new MockControl({}),
            mt: new MockControl({}),
            mb: new MockControl({}),
          },
        },
      },
    } as const;

    applyCanvaLikeResizeControls(fabric, {
      edgeControlSize: 20,
      edgeTouchLength: 300,
      edgeTouchThickness: 44,
    });

    expect(fabric.Object.prototype.controls.ml.touchSizeX).toBe(44);
    expect(fabric.Object.prototype.controls.ml.touchSizeY).toBe(300);
    expect(fabric.Object.prototype.controls.mt.touchSizeX).toBe(300);
    expect(fabric.Object.prototype.controls.mt.touchSizeY).toBe(44);
    expect(fabric.Object.prototype.controls.ml.sizeX).toBe(20);
    expect(fabric.Object.prototype.controls.ml.sizeY).toBe(20);
  });

  test("keeps textbox resize handlers while improving touch target", () => {
    const changeWidth = Symbol("changeWidth");

    const fabric = {
      Control: MockControl,
      Object: {
        prototype: {
          controls: {
            ml: new MockControl({}),
            mr: new MockControl({}),
            mt: new MockControl({}),
            mb: new MockControl({}),
          },
        },
      },
      Textbox: {
        prototype: {
          controls: {
            ml: new MockControl({ actionHandler: changeWidth }),
            mr: new MockControl({ actionHandler: changeWidth }),
            mt: new MockControl({}),
            mb: new MockControl({}),
          },
        },
      },
    } as const;

    applyCanvaLikeResizeControls(fabric, {
      edgeControlSize: 16,
      edgeTouchLength: 240,
      edgeTouchThickness: 32,
    });

    expect(fabric.Textbox.prototype.controls.ml.actionHandler).toBe(changeWidth);
    expect(fabric.Textbox.prototype.controls.mr.actionHandler).toBe(changeWidth);
    expect(fabric.Textbox.prototype.controls.ml.touchSizeX).toBe(32);
    expect(fabric.Textbox.prototype.controls.ml.touchSizeY).toBe(240);
    expect(fabric.Textbox.prototype.controls.ml.sizeX).toBe(16);
    expect(fabric.Textbox.prototype.controls.ml.sizeY).toBe(16);
  });
});
