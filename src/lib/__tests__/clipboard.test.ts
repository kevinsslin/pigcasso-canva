import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import { copyTextToClipboard } from "../clipboard";

describe("copyTextToClipboard", () => {
  test("uses navigator.clipboard when available", async () => {
    const prevNavigator = globalThis.navigator;
    const prevDocument = globalThis.document;
    const prevWindow = globalThis.window;

    let copied: string | null = null;
    try {
      Reflect.deleteProperty(globalThis, "window");
      Reflect.deleteProperty(globalThis, "document");

      (globalThis as any).navigator = {
        clipboard: {
          writeText: async (value: string) => {
            copied = value;
          },
        },
      };

      const ok = await copyTextToClipboard("hello");
      expect(ok).toBe(true);
      expect(copied).toBe("hello");
    } finally {
      (globalThis as any).navigator = prevNavigator;
      (globalThis as any).document = prevDocument;
      (globalThis as any).window = prevWindow;
    }
  });

  test("falls back to document.execCommand when clipboard rejects", async () => {
    const prevNavigator = globalThis.navigator;
    const prevDocument = globalThis.document;
    const prevWindow = globalThis.window;

    const dom = new JSDOM("<!doctype html><html><body></body></html>");

    try {
      (globalThis as any).window = dom.window as any;
      (globalThis as any).document = dom.window.document as any;

      let execCalled = false;
      (globalThis.document as any).execCommand = (command: string) => {
        execCalled = true;
        return command === "copy";
      };

      (globalThis as any).navigator = {
        clipboard: {
          writeText: async () => {
            throw new Error("nope");
          },
        },
      };

      const ok = await copyTextToClipboard("fallback");
      expect(ok).toBe(true);
      expect(execCalled).toBe(true);
    } finally {
      (globalThis as any).navigator = prevNavigator;
      (globalThis as any).document = prevDocument;
      (globalThis as any).window = prevWindow;
    }
  });

  test("returns false when neither clipboard nor document exist", async () => {
    const prevNavigator = globalThis.navigator;
    const prevDocument = globalThis.document;
    const prevWindow = globalThis.window;

    try {
      Reflect.deleteProperty(globalThis, "navigator");
      Reflect.deleteProperty(globalThis, "window");
      Reflect.deleteProperty(globalThis, "document");

      const ok = await copyTextToClipboard("nope");
      expect(ok).toBe(false);
    } finally {
      (globalThis as any).navigator = prevNavigator;
      (globalThis as any).document = prevDocument;
      (globalThis as any).window = prevWindow;
    }
  });
});

