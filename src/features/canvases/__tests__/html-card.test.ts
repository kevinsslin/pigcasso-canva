/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { createHtmlCardSrcDoc, HTML_CARD_DEFAULT_SIZE, HTML_CARD_SHAPE_TYPE, upsertHtmlCard } from "@/features/canvases/tldraw/html-card";

describe("tldraw HTML card helpers", () => {
  test("createHtmlCardSrcDoc wraps HTML fragments", () => {
    const srcDoc = createHtmlCardSrcDoc("<div>Hello</div>");
    expect(srcDoc).toContain("<!doctype html>");
    expect(srcDoc).toContain("<base target=\"_blank\" />");
    expect(srcDoc).toContain("<div>Hello</div>");
  });

  test("createHtmlCardSrcDoc passes through full documents", () => {
    const full = "<!doctype html><html><body><h1>Hi</h1></body></html>";
    expect(createHtmlCardSrcDoc(full)).toBe(full);
  });

  test("upsertHtmlCard creates a new shape at a centered position", () => {
    const calls: { created: any[]; updated: any[]; selected: any[] } = {
      created: [],
      updated: [],
      selected: [],
    };

    const editor = {
      createShape: (shape: any) => {
        calls.created.push(shape);
        return editor;
      },
      updateShape: (partial: any) => {
        calls.updated.push(partial);
        return editor;
      },
      select: (...ids: any[]) => {
        calls.selected.push(ids);
        return editor;
      },
    };

    const point = { x: 1000, y: 800 };
    const { id, mode } = upsertHtmlCard(editor, { html: "<h1>Hi</h1>", point });

    expect(mode).toBe("created");
    expect(id).toStartWith("shape:");
    expect(calls.created).toHaveLength(1);
    expect(calls.updated).toHaveLength(0);
    expect(calls.selected).toEqual([[id]]);

    const created = calls.created[0];
    expect(created.type).toBe(HTML_CARD_SHAPE_TYPE);
    expect(created.props).toEqual({ ...HTML_CARD_DEFAULT_SIZE, html: "<h1>Hi</h1>" });
    expect(created.x).toBe(point.x - HTML_CARD_DEFAULT_SIZE.w / 2);
    expect(created.y).toBe(point.y - HTML_CARD_DEFAULT_SIZE.h / 2);
  });

  test("upsertHtmlCard updates the existing shape", () => {
    const calls: { created: any[]; updated: any[]; selected: any[] } = {
      created: [],
      updated: [],
      selected: [],
    };

    const editor = {
      createShape: (shape: any) => {
        calls.created.push(shape);
        return editor;
      },
      updateShape: (partial: any) => {
        calls.updated.push(partial);
        return editor;
      },
      select: (...ids: any[]) => {
        calls.selected.push(ids);
        return editor;
      },
    };

    const existingShapeId = "shape:existing";
    const point = { x: 0, y: 0 };
    const { id, mode } = upsertHtmlCard(editor, { html: "<h1>Updated</h1>", point, existingShapeId });

    expect(mode).toBe("updated");
    expect(id).toBe(existingShapeId);
    expect(calls.created).toHaveLength(0);
    expect(calls.updated).toHaveLength(1);
    expect(calls.selected).toEqual([[existingShapeId]]);

    const updated = calls.updated[0];
    expect(updated).toEqual({
      id: existingShapeId,
      type: HTML_CARD_SHAPE_TYPE,
      props: { html: "<h1>Updated</h1>" },
    });
  });
});

