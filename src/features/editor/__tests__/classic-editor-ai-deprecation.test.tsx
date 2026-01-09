/// <reference types="bun-types" />

import React from "react";
import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

describe("Classic editor UI (UX regression)", () => {
  test("removes AI + Repos entry points from the classic sidebar", async () => {
    const { Sidebar } = await import("@/features/editor/components/sidebar");

    const html = renderToString(
      <Sidebar activeTool="select" onChangeActiveTool={() => {}} />,
    );

    expect(html).toContain("Design");
    expect(html).not.toContain(">AI<");
    expect(html).not.toContain(">Repos<");
  });

  test("removes AI entry point from the classic mobile dock", async () => {
    const { MobileToolDock } = await import("@/features/editor/components/mobile-tool-dock");

    const html = renderToString(
      <MobileToolDock activeTool="select" onChangeActiveTool={() => {}} />,
    );

    expect(html).toContain("Design");
    expect(html).not.toContain(">AI<");
  });
});

