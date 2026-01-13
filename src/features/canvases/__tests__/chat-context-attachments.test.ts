/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildCanvasChatContextAttachments } from "@/features/canvases/lib/chat-context-attachments";
import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";

describe("buildCanvasChatContextAttachments", () => {
  test("builds image/html attachments with previews and de-dupes shape ids", () => {
    const editor = {
      getShape: (shapeId: string) => {
        if (shapeId === "shape:img") return { type: "image", props: { assetId: "asset:1" } };
        if (shapeId === "shape:html") return { type: HTML_CARD_SHAPE_TYPE };
        if (shapeId === "shape:text") return { type: "text" };
        return null;
      },
      getAsset: (assetId: string) => {
        if (assetId !== "asset:1") return null;
        return { props: { src: "https://example.com/img.png", name: "IMG_0001.png" }, meta: {} };
      },
    };

    const result = buildCanvasChatContextAttachments(editor as any, ["shape:img", "shape:text", "shape:html", "shape:img"]);
    expect(result).toEqual([
      {
        id: "ctx:shape:img",
        type: "image",
        label: "IMG_0001.png",
        shapeId: "shape:img",
        url: "https://example.com/img.png",
      },
      {
        id: "ctx:shape:html",
        type: "html",
        label: "HTML",
        shapeId: "shape:html",
      },
    ]);
  });

  test("respects max option", () => {
    const editor = {
      getShape: (shapeId: string) => {
        if (shapeId === "shape:img") return { type: "image", props: { assetId: "asset:1" } };
        if (shapeId === "shape:html") return { type: HTML_CARD_SHAPE_TYPE };
        return null;
      },
      getAsset: () => ({ props: { src: "https://example.com/img.png", name: "IMG_0001.png" }, meta: {} }),
    };

    const result = buildCanvasChatContextAttachments(editor as any, ["shape:img", "shape:html"], { max: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("image");
  });
});

