/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { sanitizeTldrawStoreSnapshot } from "@/features/canvases/tldraw/sanitize-snapshot";

describe("sanitizeTldrawStoreSnapshot", () => {
  test("patches image assets with fileSize=0", () => {
    const snapshot = {
      store: {
        "asset:1": {
          id: "asset:1",
          typeName: "asset",
          type: "image",
          props: { src: "https://example.com/pig.png", w: 100, h: 100, fileSize: 0, mimeType: "image/png" },
        },
      },
    };

    const next = sanitizeTldrawStoreSnapshot(snapshot);
    expect(next).not.toBe(snapshot);
    expect((next as any).store["asset:1"].props.fileSize).toBe(1);
  });

  test("returns original snapshot when already valid", () => {
    const snapshot = {
      store: {
        "asset:1": {
          id: "asset:1",
          typeName: "asset",
          type: "image",
          props: { src: "https://example.com/pig.png", w: 100, h: 100, fileSize: 12, mimeType: "image/png" },
        },
      },
    };

    const next = sanitizeTldrawStoreSnapshot(snapshot);
    expect(next).toBe(snapshot);
  });
});

