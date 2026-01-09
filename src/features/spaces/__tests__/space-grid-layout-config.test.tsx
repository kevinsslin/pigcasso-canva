/// <reference types="bun-types" />

import React from "react";
import { describe, expect, test, mock } from "bun:test";
import { renderToString } from "react-dom/server";

let capturedProps: Record<string, unknown> | null = null;

mock.module("react-grid-layout", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedProps = props;
    return null;
  },
  useContainerWidth: () => ({
    width: 1024,
    containerRef: { current: null },
    mounted: true,
  }),
}));

describe("SpaceGridLayout (UX regression)", () => {
  test("passes edge + corner resize handles and blocks drag while resizing", async () => {
    capturedProps = null;
    const { SpaceGridLayout } = await import("@/features/spaces/components/space-grid-layout");

    renderToString(
      <SpaceGridLayout
        cols={12}
        rowHeight={40}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable
        isResizable
        isBounded
        layout={[{ i: "a", x: 0, y: 0, w: 2, h: 2 }]}
      >
        <div key="a">A</div>
      </SpaceGridLayout>,
    );

    expect(capturedProps).not.toBeNull();

    const dragConfig = (capturedProps?.dragConfig ?? null) as Record<string, unknown> | null;
    const resizeConfig = (capturedProps?.resizeConfig ?? null) as Record<string, unknown> | null;

    expect(dragConfig).not.toBeNull();
    expect(resizeConfig).not.toBeNull();

    expect(dragConfig?.enabled).toBe(true);
    expect(dragConfig?.cancel).toContain(".react-resizable-handle");
    expect(dragConfig?.cancel).toContain("button");

    expect(resizeConfig?.enabled).toBe(true);
    expect(resizeConfig?.handles).toEqual(["n", "s", "e", "w", "ne", "nw", "se", "sw"]);
  });

  test("respects draggableHandle when explicitly provided (opt-in)", async () => {
    capturedProps = null;
    const { SpaceGridLayout } = await import("@/features/spaces/components/space-grid-layout");

    renderToString(
      <SpaceGridLayout
        cols={12}
        rowHeight={40}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable
        isResizable={false}
        isBounded
        draggableHandle=".drag-handle"
        layout={[{ i: "a", x: 0, y: 0, w: 2, h: 2 }]}
      >
        <div key="a">A</div>
      </SpaceGridLayout>,
    );

    const dragConfig = (capturedProps?.dragConfig ?? null) as Record<string, unknown> | null;
    expect(dragConfig?.handle).toBe(".drag-handle");
  });
});
