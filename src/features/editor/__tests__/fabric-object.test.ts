/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { ALL_CONTROLS_VISIBLE, makeObjectInteractive } from "@/features/editor/fabric-object";

describe("makeObjectInteractive", () => {
  test("skips non-interactive objects", () => {
    const setCalls: Record<string, unknown>[] = [];

    const clipObject = {
      name: "clip",
      set: (props: Record<string, unknown>) => setCalls.push(props),
      setControlsVisibility: () => {},
    };

    makeObjectInteractive(clipObject);
    expect(setCalls).toHaveLength(0);
  });

  test("enables move + all resize controls", () => {
    const setCalls: Record<string, unknown>[] = [];
    const visibilityCalls: Record<string, boolean>[] = [];

    const object = {
      name: "rect",
      set: (props: Record<string, unknown>) => setCalls.push(props),
      setControlsVisibility: (options: Record<string, boolean>) =>
        visibilityCalls.push(options),
    };

    makeObjectInteractive(object);

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]).toMatchObject({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      hoverCursor: "move",
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
    });

    expect(visibilityCalls).toEqual([ALL_CONTROLS_VISIBLE]);
  });
});

