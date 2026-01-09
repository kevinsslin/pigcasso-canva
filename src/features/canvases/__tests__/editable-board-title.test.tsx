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

let dom: JSDOM | null = null;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "https://app.example",
  });
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 0);
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  dom?.window.close();
  dom = null;

  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = globals.isReactAct;
});

describe("EditableBoardTitle", () => {
  test("opens rename dialog and calls onRename", async () => {
    const { EditableBoardTitle } = await import("../components/editable-board-title");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    let renamed: string | null = null;
    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <EditableBoardTitle
          name="Untitled"
          onRename={async (next) => {
            renamed = next;
          }}
        />,
      );
    });

    const trigger = container?.querySelector("button[aria-label=\"Rename board\"]") as HTMLButtonElement | null;
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const input = document.querySelector("[data-testid=\"editable-board-title-input\"]") as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      if (!input) return;
      input.value = "  My Board  ";
    });

    const save = document.querySelector("button[aria-label=\"Save board name\"]") as HTMLButtonElement | null;
    expect(save).not.toBeNull();

    await act(async () => {
      save?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(renamed).toBe("My Board");
    expect(document.querySelector("[data-testid=\"editable-board-title-input\"]")).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});
