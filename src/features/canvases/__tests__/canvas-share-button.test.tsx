/// <reference types="bun-types" />

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { createRoot } from "react-dom/client";

let copiedText: string | null = null;

const globals = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  isReactAct: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
};

beforeEach(() => {
  copiedText = null;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "https://app.example",
  });
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;

  Object.defineProperty(globalThis.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        copiedText = text;
      },
    },
  });
});

afterEach(() => {
  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = globals.isReactAct;
});

describe("CanvasShareButton", () => {
  test("copies a share URL on click", async () => {
    const { CanvasShareButton } = await import("../components/canvas-share-button");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);
    await act(async () => {
      root.render(<CanvasShareButton canvasId="abc" />);
    });

    const button = container?.querySelector("button[aria-label=\"Share\"]") as HTMLButtonElement | null;
    expect(button).not.toBeNull();

    await act(async () => {
      button?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(copiedText).toBe("https://app.example/canvas/abc");

    root.unmount();
  });
});
