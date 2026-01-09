import { describe, expect, test } from "bun:test";

import { getCanvasShareUrl } from "../utils/canvas-share";

describe("getCanvasShareUrl", () => {
  test("uses window.location.origin when available", () => {
    const prevWindow = globalThis.window;
    const prevEnv = process.env.NEXT_PUBLIC_APP_URL;

    try {
      process.env.NEXT_PUBLIC_APP_URL = "https://env.example";
      (globalThis as any).window = { location: { origin: "https://client.example" } };

      expect(getCanvasShareUrl("abc")).toBe("https://client.example/canvas/abc");
    } finally {
      (globalThis as any).window = prevWindow;
      process.env.NEXT_PUBLIC_APP_URL = prevEnv;
    }
  });

  test("falls back to NEXT_PUBLIC_APP_URL when window is unavailable", () => {
    const prevWindow = globalThis.window;
    const prevEnv = process.env.NEXT_PUBLIC_APP_URL;

    try {
      Reflect.deleteProperty(globalThis, "window");
      process.env.NEXT_PUBLIC_APP_URL = "https://env.example";

      expect(getCanvasShareUrl("abc")).toBe("https://env.example/canvas/abc");
    } finally {
      (globalThis as any).window = prevWindow;
      process.env.NEXT_PUBLIC_APP_URL = prevEnv;
    }
  });
});

