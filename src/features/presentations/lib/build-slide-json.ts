import { fabric } from "fabric";

import { JSON_KEYS } from "@/features/editor/types";
import type { PresentationDeckSpec, PresentationSlideSpec, PresentationTheme } from "@/features/presentations/types";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const createWorkspace = (width: number, height: number, theme: PresentationTheme) =>
  new fabric.Rect({
    width,
    height,
    name: "clip",
    fill: theme.background,
    selectable: false,
    hasControls: false,
    shadow: new fabric.Shadow({
      color: "rgba(0,0,0,0.18)",
      blur: 8,
    }),
  });

const addAccentShapes = (
  canvas: fabric.Canvas,
  width: number,
  height: number,
  theme: PresentationTheme,
  seed: number,
) => {
  const opacity = 0.14 + (seed % 3) * 0.03;
  const bigRadius = clamp(Math.round(width * 0.22), 220, 520);
  const smallRadius = clamp(Math.round(width * 0.12), 120, 320);

  const big = new fabric.Circle({
    radius: bigRadius,
    left: width - bigRadius * 1.3,
    top: height - bigRadius * 1.2,
    fill: theme.secondary,
    opacity,
    selectable: false,
    evented: false,
  });

  const small = new fabric.Circle({
    radius: smallRadius,
    left: -smallRadius * 0.4,
    top: -smallRadius * 0.35,
    fill: theme.accent,
    opacity: opacity * 0.85,
    selectable: false,
    evented: false,
  });

  const strip = new fabric.Rect({
    left: width * 0.78,
    top: height * 0.14,
    width: width * 0.18,
    height: height * 0.72,
    rx: 48,
    ry: 48,
    fill: theme.primary,
    opacity: 0.08,
    selectable: false,
    evented: false,
  });

  canvas.add(big, small, strip);
};

const addHeaderBadge = (
  canvas: fabric.Canvas,
  theme: PresentationTheme,
  title: string,
) => {
  const badge = new fabric.Textbox(title, {
    left: 64,
    top: 56,
    width: 520,
    fontFamily: theme.fontFamily,
    fontSize: 22,
    fontWeight: 800,
    fill: theme.primary,
  });
  canvas.add(badge);
};

const addSlideNumber = (
  canvas: fabric.Canvas,
  theme: PresentationTheme,
  width: number,
  height: number,
  index: number,
  total: number,
) => {
  const label = new fabric.Textbox(`${index + 1}/${total}`, {
    left: width - 92,
    top: height - 64,
    width: 140,
    fontFamily: theme.fontFamily,
    fontSize: 18,
    fontWeight: 700,
    fill: theme.text,
    opacity: 0.6,
    textAlign: "right",
  });
  canvas.add(label);
};

const buildBullets = (bullets: string[] | undefined) => {
  const items = (bullets ?? []).filter(Boolean).slice(0, 6);
  if (!items.length) return null;
  return items.map((item) => `• ${item}`).join("\n");
};

const addTitleSlide = (
  canvas: fabric.Canvas,
  slide: PresentationSlideSpec,
  theme: PresentationTheme,
  width: number,
  height: number,
) => {
  const title = new fabric.Textbox(slide.title, {
    left: 96,
    top: height * 0.32,
    width: width * 0.78,
    fontFamily: theme.fontFamily,
    fontSize: 92,
    fontWeight: 900,
    fill: theme.text,
    lineHeight: 1.08,
  });
  canvas.add(title);

  if (slide.subtitle) {
    const subtitle = new fabric.Textbox(slide.subtitle, {
      left: 100,
      top: height * 0.52,
      width: width * 0.7,
      fontFamily: theme.fontFamily,
      fontSize: 34,
      fontWeight: 650,
      fill: theme.text,
      opacity: 0.7,
      lineHeight: 1.25,
    });
    canvas.add(subtitle);
  }
};

const addBulletsSlide = (
  canvas: fabric.Canvas,
  slide: PresentationSlideSpec,
  theme: PresentationTheme,
  width: number,
  height: number,
) => {
  const title = new fabric.Textbox(slide.title, {
    left: 96,
    top: 96,
    width: width * 0.72,
    fontFamily: theme.fontFamily,
    fontSize: 58,
    fontWeight: 900,
    fill: theme.text,
    lineHeight: 1.1,
  });
  canvas.add(title);

  if (slide.subtitle) {
    const subtitle = new fabric.Textbox(slide.subtitle, {
      left: 96,
      top: 176,
      width: width * 0.72,
      fontFamily: theme.fontFamily,
      fontSize: 28,
      fontWeight: 650,
      fill: theme.text,
      opacity: 0.7,
      lineHeight: 1.25,
    });
    canvas.add(subtitle);
  }

  const bulletsText = buildBullets(slide.bullets);
  if (bulletsText) {
    const body = new fabric.Textbox(bulletsText, {
      left: 112,
      top: 280,
      width: width * 0.6,
      fontFamily: theme.fontFamily,
      fontSize: 34,
      fontWeight: 600,
      fill: theme.text,
      opacity: 0.88,
      lineHeight: 1.35,
    });
    canvas.add(body);
  }

  const card = new fabric.Rect({
    left: width * 0.72,
    top: height * 0.3,
    width: width * 0.2,
    height: height * 0.4,
    rx: 44,
    ry: 44,
    fill: theme.surface,
    opacity: 0.85,
    selectable: false,
    evented: false,
  });
  const dot1 = new fabric.Circle({
    radius: 22,
    left: width * 0.77,
    top: height * 0.36,
    fill: theme.primary,
    opacity: 0.9,
    selectable: false,
    evented: false,
  });
  const dot2 = new fabric.Circle({
    radius: 22,
    left: width * 0.82,
    top: height * 0.42,
    fill: theme.secondary,
    opacity: 0.9,
    selectable: false,
    evented: false,
  });
  const dot3 = new fabric.Circle({
    radius: 22,
    left: width * 0.77,
    top: height * 0.48,
    fill: theme.accent,
    opacity: 0.9,
    selectable: false,
    evented: false,
  });
  canvas.add(card, dot1, dot2, dot3);
};

const addQuoteSlide = (
  canvas: fabric.Canvas,
  slide: PresentationSlideSpec,
  theme: PresentationTheme,
  width: number,
  height: number,
) => {
  const quote = slide.subtitle ?? buildBullets(slide.bullets) ?? "";
  const text = quote || slide.title;

  const panel = new fabric.Rect({
    left: width * 0.12,
    top: height * 0.24,
    width: width * 0.76,
    height: height * 0.52,
    rx: 64,
    ry: 64,
    fill: theme.surface,
    opacity: 0.82,
    selectable: false,
    evented: false,
  });
  canvas.add(panel);

  const quoteText = new fabric.Textbox(`“${text}”`, {
    left: width * 0.16,
    top: height * 0.32,
    width: width * 0.68,
    fontFamily: theme.fontFamily,
    fontSize: 48,
    fontWeight: 750,
    fill: theme.text,
    lineHeight: 1.25,
    textAlign: "center",
  });
  canvas.add(quoteText);

  const caption = new fabric.Textbox(slide.title, {
    left: width * 0.2,
    top: height * 0.64,
    width: width * 0.6,
    fontFamily: theme.fontFamily,
    fontSize: 22,
    fontWeight: 700,
    fill: theme.primary,
    opacity: 0.9,
    textAlign: "center",
  });
  canvas.add(caption);
};

const addDiagramSlide = (
  canvas: fabric.Canvas,
  slide: PresentationSlideSpec,
  theme: PresentationTheme,
  width: number,
  height: number,
) => {
  const title = new fabric.Textbox(slide.title, {
    left: 96,
    top: 96,
    width: width * 0.8,
    fontFamily: theme.fontFamily,
    fontSize: 58,
    fontWeight: 900,
    fill: theme.text,
    lineHeight: 1.1,
  });
  canvas.add(title);

  const labels = (slide.bullets ?? []).slice(0, 3);
  const cols = labels.length || 3;
  const gap = 36;
  const boxW = (width * 0.8 - gap * (cols - 1)) / cols;
  const boxH = height * 0.26;
  const top = height * 0.36;

  for (let i = 0; i < cols; i++) {
    const left = 96 + i * (boxW + gap);
    const box = new fabric.Rect({
      left,
      top,
      width: boxW,
      height: boxH,
      rx: 44,
      ry: 44,
      fill: theme.surface,
      opacity: 0.9,
      selectable: false,
      evented: false,
    });
    canvas.add(box);

    const label = new fabric.Textbox(labels[i] ?? `Step ${i + 1}`, {
      left: left + 28,
      top: top + 28,
      width: boxW - 56,
      fontFamily: theme.fontFamily,
      fontSize: 30,
      fontWeight: 800,
      fill: theme.text,
      lineHeight: 1.2,
    });
    canvas.add(label);

    const bar = new fabric.Rect({
      left: left + 28,
      top: top + boxH - 56,
      width: boxW - 56,
      height: 12,
      rx: 12,
      ry: 12,
      fill: i === 0 ? theme.primary : i === 1 ? theme.secondary : theme.accent,
      opacity: 0.9,
      selectable: false,
      evented: false,
    });
    canvas.add(bar);
  }
};

export const buildSlideJson = (params: {
  deck: PresentationDeckSpec;
  slide: PresentationSlideSpec;
  index: number;
  width: number;
  height: number;
}) => {
  const { deck, slide, index, width, height } = params;
  const canvasEl = document.createElement("canvas");
  const canvas = new fabric.Canvas(canvasEl, {
    width,
    height,
    selection: false,
  });

  const workspace = createWorkspace(width, height, deck.theme);
  canvas.add(workspace);
  canvas.centerObject(workspace);
  canvas.clipPath = workspace;

  addAccentShapes(canvas, width, height, deck.theme, index);
  addHeaderBadge(canvas, deck.theme, "Pigcasso AI Slides");

  if (slide.layout === "title") {
    addTitleSlide(canvas, slide, deck.theme, width, height);
  } else if (slide.layout === "quote") {
    addQuoteSlide(canvas, slide, deck.theme, width, height);
  } else if (slide.layout === "diagram") {
    addDiagramSlide(canvas, slide, deck.theme, width, height);
  } else {
    addBulletsSlide(canvas, slide, deck.theme, width, height);
  }

  addSlideNumber(canvas, deck.theme, width, height, index, deck.slides.length);

  canvas.renderAll();

  const json = JSON.stringify(canvas.toJSON(JSON_KEYS));
  canvas.dispose();

  return json;
};
