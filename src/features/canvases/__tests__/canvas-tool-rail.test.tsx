/// <reference types="bun-types" />

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const globals = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  isReactAct: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
};

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;
});

afterEach(() => {
  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = globals.isReactAct;
});

describe("CanvasToolRail", () => {
  test("renders tool buttons and emits tool changes", async () => {
    const { CanvasToolRail } = await import("../components/canvas-tool-rail");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    let tool: string | null = null;
    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasToolRail
          activeTool="select"
          onToolChange={(next) => {
            tool = next;
          }}
        />,
      );
    });

    const rail = container?.querySelector("[data-testid=\"canvas-tool-rail\"]") as HTMLElement | null;
    expect(rail).not.toBeNull();
    expect(rail?.className).toContain("fixed");
    expect(rail?.className).toContain("left-6");

    const pan = container?.querySelector("button[aria-label=\"Pan\"]") as HTMLButtonElement | null;
    expect(pan).not.toBeNull();

    await act(async () => {
      pan?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });

    expect(tool).toBe("hand");
    root.unmount();
  });
});
