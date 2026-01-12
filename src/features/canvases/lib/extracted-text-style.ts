import {
  PIGCASSO_TEXT_FONT_FAMILY_META_KEY,
  TEXT_FONT_FAMILY_PRESETS,
  TEXT_COLOR_OPTIONS,
} from "@/features/canvases/lib/text-style";

import type { ExtractTextBlock } from "@/features/ai/api/use-extract-text";

type CanvasTextColorId = (typeof TEXT_COLOR_OPTIONS)[number]["id"];

const COLOR_RGB: Record<CanvasTextColorId, { r: number; g: number; b: number }> = {
  black: { r: 17, g: 24, b: 39 },
  white: { r: 255, g: 255, b: 255 },
  grey: { r: 113, g: 113, b: 122 },
  red: { r: 239, g: 68, b: 68 },
  orange: { r: 249, g: 115, b: 22 },
  yellow: { r: 250, g: 204, b: 21 },
  green: { r: 34, g: 197, b: 94 },
  blue: { r: 59, g: 130, b: 246 },
  violet: { r: 139, g: 92, b: 246 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const distSq = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

export const pickNearestCanvasTextColor = (rgb: { r: number; g: number; b: number }): CanvasTextColorId => {
  const target = {
    r: clamp(Math.round(rgb.r), 0, 255),
    g: clamp(Math.round(rgb.g), 0, 255),
    b: clamp(Math.round(rgb.b), 0, 255),
  };

  const ids = Object.keys(COLOR_RGB) as CanvasTextColorId[];
  let bestId: CanvasTextColorId = "black";
  let bestDist = Number.POSITIVE_INFINITY;

  for (const id of ids) {
    const d = distSq(target, COLOR_RGB[id]);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
};

export const inferTextColorFromRegionPixels = (params: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  region: { x: number; y: number; w: number; h: number };
}): { color: CanvasTextColorId; confidence: number } => {
  const width = Math.max(1, Math.floor(params.width));
  const height = Math.max(1, Math.floor(params.height));
  const pixels = params.pixels;
  if (pixels.length < width * height * 4) return { color: "black", confidence: 0 };

  const rx = clamp(Math.floor(params.region.x), 0, width - 1);
  const ry = clamp(Math.floor(params.region.y), 0, height - 1);
  const rw = clamp(Math.floor(params.region.w), 1, width - rx);
  const rh = clamp(Math.floor(params.region.h), 1, height - ry);
  const area = rw * rh;

  const targetSamples = 2200;
  const stride = Math.max(1, Math.floor(Math.sqrt(area / targetSamples)));

  let sampleCount = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let y = ry; y < ry + rh; y += stride) {
    for (let x = rx; x < rx + rw; x += stride) {
      const o = (y * width + x) * 4;
      const a = pixels[o + 3] ?? 255;
      if (a < 50) continue;
      sumR += pixels[o] ?? 0;
      sumG += pixels[o + 1] ?? 0;
      sumB += pixels[o + 2] ?? 0;
      sampleCount += 1;
    }
  }

  if (!sampleCount) return { color: "black", confidence: 0 };

  const mean = {
    r: sumR / sampleCount,
    g: sumG / sampleCount,
    b: sumB / sampleCount,
  };

  const bins = 64;
  const hist = new Uint32Array(bins);
  const distances: number[] = [];

  for (let y = ry; y < ry + rh; y += stride) {
    for (let x = rx; x < rx + rw; x += stride) {
      const o = (y * width + x) * 4;
      const a = pixels[o + 3] ?? 255;
      if (a < 50) continue;
      const r = pixels[o] ?? 0;
      const g = pixels[o + 1] ?? 0;
      const b = pixels[o + 2] ?? 0;
      const d = Math.sqrt(distSq({ r, g, b }, mean));
      distances.push(d);
      const idx = clamp(Math.floor((d / 442) * bins), 0, bins - 1);
      hist[idx] += 1;
    }
  }

  if (!distances.length) return { color: "black", confidence: 0 };

  const total = distances.length;
  const cutoffRank = Math.floor(total * 0.8); // top 20% by distance from region mean
  let cumulative = 0;
  let cutoffBin = bins - 1;
  for (let i = 0; i < bins; i += 1) {
    cumulative += hist[i] ?? 0;
    if (cumulative >= cutoffRank) {
      cutoffBin = i;
      break;
    }
  }
  const cutoff = (cutoffBin / bins) * 442;

  let textCount = 0;
  let textSumR = 0;
  let textSumG = 0;
  let textSumB = 0;

  for (let y = ry; y < ry + rh; y += stride) {
    for (let x = rx; x < rx + rw; x += stride) {
      const o = (y * width + x) * 4;
      const a = pixels[o + 3] ?? 255;
      if (a < 50) continue;
      const r = pixels[o] ?? 0;
      const g = pixels[o + 1] ?? 0;
      const b = pixels[o + 2] ?? 0;
      const d = Math.sqrt(distSq({ r, g, b }, mean));
      if (d < cutoff) continue;
      textSumR += r;
      textSumG += g;
      textSumB += b;
      textCount += 1;
    }
  }

  const ratio = textCount / Math.max(1, total);
  const confidence = clamp((ratio - 0.05) / 0.25, 0, 1);

  if (!textCount) return { color: "black", confidence: 0 };
  const approx = { r: textSumR / textCount, g: textSumG / textCount, b: textSumB / textCount };
  return { color: pickNearestCanvasTextColor(approx), confidence };
};

export const pickFontFamilyPresetForExtractedText = (params: {
  text: string;
  font?: ExtractTextBlock["font"];
}): { metaKey: typeof PIGCASSO_TEXT_FONT_FAMILY_META_KEY; fontFamily: string } | null => {
  const text = params.text ?? "";
  const font = params.font ?? "sans";

  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
  const presetId =
    font === "mono"
      ? "mono"
      : font === "serif"
        ? "serif"
        : hasCjk
          ? "tc"
          : "pigcasso";

  const preset = TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.id === presetId);
  if (!preset) return null;

  return { metaKey: PIGCASSO_TEXT_FONT_FAMILY_META_KEY, fontFamily: preset.value };
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });

export const loadImagePixels = async (src: string) => {
  if (typeof document === "undefined") return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  const img = await loadImage(trimmed);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);

  try {
    const image = ctx.getImageData(0, 0, width, height);
    return { pixels: image.data, width, height };
  } catch {
    return null;
  }
};

