import { describe, expect, test } from "bun:test";

import { getSelectionContext } from "@/features/canvases/lib/selection-context";
import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";

describe("getSelectionContext", () => {
  test("returns null when no shape selected", () => {
    const editor = { getShape: () => null };
    expect(getSelectionContext(editor, null)).toBeNull();
  });

  test("resolves image preview url from asset src", () => {
    const editor = {
      getShape: () => ({ type: "image", props: { assetId: "asset:1" } }),
      getAsset: () => ({ props: { src: "https://example.com/img.png", name: "IMG_0001.png" } }),
    };

    expect(getSelectionContext(editor, "shape:img")).toEqual({
      shapeId: "shape:img",
      type: "image",
      label: "IMG_0001.png",
      previewUrl: "https://example.com/img.png",
    });
  });

  test("falls back to Image • <id> when asset name is default", () => {
    const editor = {
      getShape: () => ({ type: "image", props: { assetId: "asset:1" } }),
      getAsset: () => ({ props: { src: "https://example.com/img.png", name: "Image" } }),
    };

    expect(getSelectionContext(editor, "shape:img")).toEqual({
      shapeId: "shape:img",
      type: "image",
      label: "Image • img",
      previewUrl: "https://example.com/img.png",
    });
  });

  test("labels html card shapes", () => {
    const editor = {
      getShape: () => ({ type: HTML_CARD_SHAPE_TYPE }),
    };

    expect(getSelectionContext(editor, "shape:html")).toEqual({
      shapeId: "shape:html",
      type: HTML_CARD_SHAPE_TYPE,
      label: "HTML",
    });
  });
});
