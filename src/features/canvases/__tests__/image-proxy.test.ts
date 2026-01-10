import { describe, expect, test } from "bun:test";

import {
  buildCanvasImageProxyUrl,
  isCanvasImageProxyUrl,
  toCanvasImageUrl,
  unwrapCanvasImageProxyUrl,
} from "@/features/canvases/lib/image-proxy";

describe("canvas image proxy helpers", () => {
  test("buildCanvasImageProxyUrl encodes URL", () => {
    expect(buildCanvasImageProxyUrl("https://utfs.io/f/abc.png?x=1&y=2")).toBe(
      "/api/images/proxy?url=https%3A%2F%2Futfs.io%2Ff%2Fabc.png%3Fx%3D1%26y%3D2",
    );
  });

  test("isCanvasImageProxyUrl detects relative proxy urls", () => {
    expect(isCanvasImageProxyUrl("/api/images/proxy?url=https%3A%2F%2Futfs.io%2Ff%2Fabc.png")).toBe(true);
    expect(isCanvasImageProxyUrl("/api/images/proxy")).toBe(true);
    expect(isCanvasImageProxyUrl("https://example.com/api/images/proxy?url=x")).toBe(true);
    expect(isCanvasImageProxyUrl("https://example.com/other")).toBe(false);
  });

  test("toCanvasImageUrl proxies https remote urls", () => {
    expect(toCanvasImageUrl("https://utfs.io/f/abc.png", "app.example")).toBe(
      "/api/images/proxy?url=https%3A%2F%2Futfs.io%2Ff%2Fabc.png",
    );
  });

  test("toCanvasImageUrl keeps data URLs", () => {
    expect(toCanvasImageUrl("data:image/png;base64,abc", "app.example")).toBe("data:image/png;base64,abc");
  });

  test("toCanvasImageUrl keeps same-origin urls when hostname matches", () => {
    expect(toCanvasImageUrl("https://app.example/assets/a.png", "app.example")).toBe("https://app.example/assets/a.png");
  });

  test("toCanvasImageUrl keeps unsupported hosts unproxied", () => {
    expect(toCanvasImageUrl("https://example.com/a.png", "app.example")).toBe("https://example.com/a.png");
  });

  test("unwrapCanvasImageProxyUrl returns the target for relative proxy urls", () => {
    expect(
      unwrapCanvasImageProxyUrl(
        "/api/images/proxy?url=https%3A%2F%2Futfs.io%2Ff%2Fabc.png%3Fx%3D1%26y%3D2",
      ),
    ).toBe("https://utfs.io/f/abc.png?x=1&y=2");
  });

  test("unwrapCanvasImageProxyUrl returns the target for absolute proxy urls", () => {
    expect(
      unwrapCanvasImageProxyUrl(
        "https://app.example/api/images/proxy?url=https%3A%2F%2Futfs.io%2Ff%2Fabc.png",
      ),
    ).toBe("https://utfs.io/f/abc.png");
  });
});
