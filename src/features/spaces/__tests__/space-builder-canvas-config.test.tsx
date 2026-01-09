/// <reference types="bun-types" />

import React from "react";
import { describe, expect, test, mock } from "bun:test";
import { renderToString } from "react-dom/server";
import { noOverlapCompactor } from "react-grid-layout/core";

import type { SpaceGridLayoutProps } from "@/features/spaces/components/space-grid-layout";

let capturedProps: SpaceGridLayoutProps | null = null;

mock.module("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    return (props: SpaceGridLayoutProps) => {
      capturedProps = props;
      return null;
    };
  },
}));

describe("SpaceBuilderCanvas (UX regression)", () => {
  test("defaults to dragging the whole block (no drag handle required) and enables edge resize", async () => {
    capturedProps = null;
    const { SpaceBuilderCanvas } = await import(
      "@/features/spaces/components/space-builder/space-builder-canvas"
    );

    renderToString(
      <SpaceBuilderCanvas
        blocks={[
          {
            id: "block-a",
            type: "text",
            isVisible: true,
            layout: { x: 0, y: 0, w: 2, h: 2 },
            data: { title: "Hello", body: "World" },
          },
        ]}
        handle="qa"
        walletLabel={null}
        mode="edit"
        selectedId={null}
        onSelectId={() => {}}
        onLayoutChange={() => {}}
        onDropModule={() => {}}
      />,
    );

    expect(capturedProps).not.toBeNull();
    expect(capturedProps?.isDraggable).toBe(true);
    expect(capturedProps?.isResizable).toBe(true);
    expect(capturedProps?.draggableHandle).toBeUndefined();
    expect(capturedProps?.compactor).toBe(noOverlapCompactor);
  });

  test("disables dragging/resizing in preview mode", async () => {
    capturedProps = null;
    const { SpaceBuilderCanvas } = await import(
      "@/features/spaces/components/space-builder/space-builder-canvas"
    );

    renderToString(
      <SpaceBuilderCanvas
        blocks={[
          {
            id: "block-a",
            type: "text",
            isVisible: true,
            layout: { x: 0, y: 0, w: 2, h: 2 },
            data: { title: "Hello", body: "World" },
          },
        ]}
        handle="qa"
        walletLabel={null}
        mode="preview"
        selectedId={null}
        onSelectId={() => {}}
        onLayoutChange={() => {}}
        onDropModule={() => {}}
      />,
    );

    expect(capturedProps).not.toBeNull();
    expect(capturedProps?.isDraggable).toBe(false);
    expect(capturedProps?.isResizable).toBe(false);
  });
});
