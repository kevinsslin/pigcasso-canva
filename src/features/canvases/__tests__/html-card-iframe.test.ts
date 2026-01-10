/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getHtmlCardIframeStyle, HTML_CARD_IFRAME_SANDBOX } from "@/features/canvases/tldraw/html-card-iframe";

describe("HTML card iframe config", () => {
  test("uses a safe sandbox string", () => {
    expect(HTML_CARD_IFRAME_SANDBOX).toContain("allow-scripts");
    expect(HTML_CARD_IFRAME_SANDBOX).toContain("allow-forms");
    expect(HTML_CARD_IFRAME_SANDBOX).toContain("allow-popups");
    expect(HTML_CARD_IFRAME_SANDBOX).not.toContain("allow-same-origin");
  });

  test("applies Safari z-index workaround when not interactive", () => {
    const style = getHtmlCardIframeStyle(false);
    expect(style.pointerEvents).toBe("none");
    expect(style.zIndex).toBe("-1");
  });

  test("keeps iframe on top when interactive", () => {
    const style = getHtmlCardIframeStyle(true);
    expect(style.pointerEvents).toBe("auto");
    expect(style.zIndex).toBe("");
  });
});

