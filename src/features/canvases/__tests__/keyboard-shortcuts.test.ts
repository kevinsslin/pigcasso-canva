/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { handleCanvasKeyboardShortcuts } from "@/features/canvases/tldraw/keyboard-shortcuts";

const makeEvent = (overrides: Partial<KeyboardEvent> & { key: string }) => {
  let prevented = false;
  return {
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    code: "",
    target: null,
    preventDefault: () => {
      prevented = true;
    },
    get prevented() {
      return prevented;
    },
    ...overrides,
  } as any as KeyboardEvent & { prevented: boolean };
};

describe("canvas keyboard shortcuts", () => {
  test("cmd+z triggers undo; cmd+shift+z triggers redo", () => {
    let undoCount = 0;
    let redoCount = 0;
    const editor = {
      undo: () => {
        undoCount += 1;
      },
      redo: () => {
        redoCount += 1;
      },
    };

    const undoEvent = makeEvent({ key: "z", metaKey: true });
    expect(handleCanvasKeyboardShortcuts(editor as any, undoEvent)).toBe(true);
    expect(undoEvent.prevented).toBe(true);
    expect(undoCount).toBe(1);
    expect(redoCount).toBe(0);

    const redoEvent = makeEvent({ key: "z", metaKey: true, shiftKey: true });
    expect(handleCanvasKeyboardShortcuts(editor as any, redoEvent)).toBe(true);
    expect(redoEvent.prevented).toBe(true);
    expect(redoCount).toBe(1);
  });

  test("ctrl+y triggers redo", () => {
    let redoCount = 0;
    const editor = {
      redo: () => {
        redoCount += 1;
      },
    };
    const ev = makeEvent({ key: "y", ctrlKey: true });
    expect(handleCanvasKeyboardShortcuts(editor as any, ev)).toBe(true);
    expect(ev.prevented).toBe(true);
    expect(redoCount).toBe(1);
  });

  test("cmd+d duplicates selected shapes", () => {
    let called = 0;
    let lastArgs: any[] = [];
    const editor = {
      getSelectedShapeIds: () => ["shape:a"],
      duplicateShapes: (...args: any[]) => {
        called += 1;
        lastArgs = args;
      },
    };
    const ev = makeEvent({ key: "d", metaKey: true });
    expect(handleCanvasKeyboardShortcuts(editor as any, ev)).toBe(true);
    expect(ev.prevented).toBe(true);
    expect(called).toBe(1);
    expect(lastArgs[0]).toEqual(["shape:a"]);
  });

  test("cmd+c copies to internal clipboard; cmd+v pastes it", () => {
    const clipboard = { current: null as any };
    const content = { schema: "x", shapes: [] };
    let pasteCount = 0;

    const editor = {
      getSelectedShapeIds: () => ["shape:a"],
      getContentFromCurrentPage: () => content,
      putContentOntoCurrentPage: () => {
        pasteCount += 1;
      },
    };

    const copyEv = makeEvent({ key: "c", metaKey: true });
    expect(handleCanvasKeyboardShortcuts(editor as any, copyEv, { clipboardRef: clipboard })).toBe(true);
    expect(clipboard.current).toBe(content);

    const pasteEv = makeEvent({ key: "v", metaKey: true });
    expect(handleCanvasKeyboardShortcuts(editor as any, pasteEv, { clipboardRef: clipboard })).toBe(true);
    expect(pasteCount).toBe(1);
  });

  test("escape and single-letter tool keys call onToolChange", () => {
    const calls: string[] = [];
    const onToolChange = (tool: any) => calls.push(tool);
    const editor = {};

    expect(handleCanvasKeyboardShortcuts(editor as any, makeEvent({ key: "t" }), { onToolChange })).toBe(true);
    expect(handleCanvasKeyboardShortcuts(editor as any, makeEvent({ key: "v" }), { onToolChange })).toBe(true);
    expect(handleCanvasKeyboardShortcuts(editor as any, makeEvent({ key: "Escape" }), { onToolChange })).toBe(true);
    expect(calls).toEqual(["text", "select", "select"]);
  });
});

