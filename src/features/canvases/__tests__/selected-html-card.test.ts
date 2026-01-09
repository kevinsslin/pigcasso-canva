import { describe, expect, test } from "bun:test";

import { HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import { getSelectedHtmlCard } from "@/features/canvases/tldraw/selected-html-card";

describe("getSelectedHtmlCard", () => {
  test("returns null when editor missing", () => {
    expect(getSelectedHtmlCard(null)).toBe(null);
  });

  test("returns null when nothing is selected", () => {
    expect(
      getSelectedHtmlCard({
        getSelectedShapeIds: () => [],
        getShape: () => undefined,
      }),
    ).toBe(null);
  });

  test("returns null when selection is not an html card", () => {
    expect(
      getSelectedHtmlCard({
        getSelectedShapeIds: () => ["shape:1"],
        getShape: () => ({ type: "image", props: {} }),
      }),
    ).toBe(null);
  });

  test("returns null when html is blank", () => {
    expect(
      getSelectedHtmlCard({
        getSelectedShapeIds: () => ["shape:1"],
        getShape: () => ({ type: HTML_CARD_SHAPE_TYPE, props: { html: "   " } }),
      }),
    ).toBe(null);
  });

  test("returns selected html card html", () => {
    expect(
      getSelectedHtmlCard({
        getSelectedShapeIds: () => ["shape:abc"],
        getShape: () => ({ type: HTML_CARD_SHAPE_TYPE, props: { html: "<h1>Hello</h1>" } }),
      }),
    ).toEqual({ shapeId: "shape:abc", html: "<h1>Hello</h1>" });
  });
});

