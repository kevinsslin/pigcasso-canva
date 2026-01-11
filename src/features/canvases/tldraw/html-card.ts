import { createShapeId } from "@tldraw/tlschema";

export const HTML_CARD_SHAPE_TYPE = "html-card" as const;

export const HTML_CARD_DEFAULT_SIZE = {
  w: 800,
  h: 600,
} as const;

export const HTML_CARD_MIN_SIZE = {
  w: 240,
  h: 160,
} as const;

export type HtmlCardPagePoint = { x: number; y: number };

export type HtmlCardUpsertMode = "created" | "updated";

export type HtmlCardEditor = {
  createShape: (shape: unknown) => unknown;
  updateShape: (partial: unknown) => unknown;
  select: (...shapes: unknown[]) => unknown;
};

const PIGCASSO_HTML_BASE_STYLES = `
  :root{color-scheme:light;}
  html,body{height:100%;margin:0;padding:0;background:#F3F4F5 !important;color:#111827 !important;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
  *,*::before,*::after{box-sizing:border-box;}
  img,svg,video,canvas{max-width:100%;height:auto;}
`.trim();

const buildPigcassoHtmlHeadInjection = () =>
  [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "<base target=\"_blank\" />",
    `<style id="pigcasso-base">${PIGCASSO_HTML_BASE_STYLES}</style>`,
  ].join("");

const injectIntoFullHtmlDocument = (html: string) => {
  const injection = buildPigcassoHtmlHeadInjection();

  if (/<\/head\s*>/i.test(html)) {
    return html.replace(/<\/head\s*>/i, `${injection}</head>`);
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (match) => `${match}${injection}`);
  }

  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body/i, `<head>${injection}</head><body`);
  }

  return html;
};

export function createHtmlCardSrcDoc(html: string) {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const looksLikeFullDoc = /<html[\s>]/i.test(trimmed) || /<!doctype\s+html/i.test(trimmed);
  if (looksLikeFullDoc) return injectIntoFullHtmlDocument(trimmed);

  const injection = buildPigcassoHtmlHeadInjection();
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    injection,
    "</head>",
    "<body>",
    trimmed,
    "</body>",
    "</html>",
  ].join("");
}

export function upsertHtmlCard(editor: HtmlCardEditor, options: {
  html: string;
  point: HtmlCardPagePoint;
  existingShapeId?: string;
  w?: number;
  h?: number;
}): { id: string; mode: HtmlCardUpsertMode } {
  const w = options.w ?? HTML_CARD_DEFAULT_SIZE.w;
  const h = options.h ?? HTML_CARD_DEFAULT_SIZE.h;

  const id = options.existingShapeId ?? createShapeId();
  const mode: HtmlCardUpsertMode = options.existingShapeId ? "updated" : "created";

  if (mode === "updated") {
    editor.updateShape({
      id,
      type: HTML_CARD_SHAPE_TYPE,
      props: { html: options.html },
    });
  } else {
    editor.createShape({
      id,
      type: HTML_CARD_SHAPE_TYPE,
      x: options.point.x - w / 2,
      y: options.point.y - h / 2,
      props: { w, h, html: options.html },
    });
  }

  editor.select(id);
  return { id, mode };
}
