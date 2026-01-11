/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const globals = {
  window: globalThis.window,
  document: globalThis.document,
  HTMLElement: (globalThis as any).HTMLElement,
};

let dom: JSDOM | null = null;

beforeEach(() => {
  dom = new JSDOM(
    "<!doctype html><html><body><input id=\"i\" /><div class=\"tl-container\"><input id=\"tl\" /></div></body></html>",
    {
    url: "https://app.example",
    },
  );
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).HTMLElement = dom.window.HTMLElement as any;
});

afterEach(() => {
  dom?.window.close();
  dom = null;

  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).HTMLElement = globals.HTMLElement;
});

describe("tldraw delete shortcut helper", () => {
  test("deletes selected shapes on Backspace when target is not editable", async () => {
    const { handleCanvasDeleteShortcut } = await import("@/features/canvases/tldraw/delete-shortcut");

    const deleted: string[][] = [];

    const editor = {
      getSelectedShapeIds: () => ["shape:a", "shape:b"],
      deleteShapes: (ids: string[]) => {
        deleted.push(ids);
      },
    };

    let handled = false;

    window.addEventListener("keydown", (event) => {
      handled = handleCanvasDeleteShortcut(editor, event);
    });

    const event = new window.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(handled).toBe(true);
    expect(deleted).toEqual([["shape:a", "shape:b"]]);
    expect(event.defaultPrevented).toBe(true);
  });

  test("does not delete when keydown happens inside an input", async () => {
    const { handleCanvasDeleteShortcut } = await import("@/features/canvases/tldraw/delete-shortcut");

    const deleted: string[][] = [];
    const editor = {
      getSelectedShapeIds: () => ["shape:a"],
      deleteShapes: (ids: string[]) => {
        deleted.push(ids);
      },
    };

    let handled = false;

    window.addEventListener("keydown", (event) => {
      handled = handleCanvasDeleteShortcut(editor, event);
    });

    const input = document.getElementById("i") as HTMLInputElement;
    input.focus();

    const event = new window.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(handled).toBe(false);
    expect(deleted).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  test("deletes when keydown happens inside a tldraw container input", async () => {
    const { handleCanvasDeleteShortcut } = await import("@/features/canvases/tldraw/delete-shortcut");

    const deleted: string[][] = [];
    const editor = {
      getSelectedShapeIds: () => ["shape:a"],
      deleteShapes: (ids: string[]) => {
        deleted.push(ids);
      },
    };

    let handled = false;

    window.addEventListener("keydown", (event) => {
      handled = handleCanvasDeleteShortcut(editor, event);
    });

    const input = document.getElementById("tl") as HTMLInputElement;
    input.focus();

    const event = new window.KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(handled).toBe(true);
    expect(deleted).toEqual([["shape:a"]]);
    expect(event.defaultPrevented).toBe(true);
  });

  test("does not delete while editing a shape", async () => {
    const { handleCanvasDeleteShortcut } = await import("@/features/canvases/tldraw/delete-shortcut");

    const deleted: string[][] = [];
    const editor = {
      getEditingShapeId: () => "shape:editing",
      getSelectedShapeIds: () => ["shape:a"],
      deleteShapes: (ids: string[]) => {
        deleted.push(ids);
      },
    };

    let handled = false;

    window.addEventListener("keydown", (event) => {
      handled = handleCanvasDeleteShortcut(editor, event);
    });

    const event = new window.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(handled).toBe(false);
    expect(deleted).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });
});
