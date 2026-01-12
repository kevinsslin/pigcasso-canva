import type { ExtractTextBlock } from "@/features/ai/api/use-extract-text";

export type ExtractTextFilterOptions = {
  imageWidth?: number;
  imageHeight?: number;
  maxBlocks?: number;
  minHeightPx?: number;
  minAreaRatio?: number;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const normalizeBox = (box: ExtractTextBlock["box"] | undefined | null) => {
  if (!box) return null;
  const x = Number(box.x);
  const y = Number(box.y);
  const w = Number(box.w);
  const h = Number(box.h);
  if (![x, y, w, h].every(isFiniteNumber)) return null;
  if (w <= 0 || h <= 0) return null;
  return { x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h) };
};

export const filterProminentTextBlocks = (blocks: ExtractTextBlock[], options?: ExtractTextFilterOptions) => {
  const maxBlocks = Math.max(1, Math.min(40, Math.floor(options?.maxBlocks ?? 16)));
  const imageWidth = Math.max(1, Math.floor(options?.imageWidth ?? 1024));
  const imageHeight = Math.max(1, Math.floor(options?.imageHeight ?? 1024));
  const minHeightPx = Math.max(8, Math.floor(options?.minHeightPx ?? 20));
  const minHeightRatio = clamp01(minHeightPx / imageHeight);
  const minAreaRatio = clamp01(options?.minAreaRatio ?? 0.0006);

  const cleaned = blocks
    .map((block) => {
      const text = typeof block.text === "string" ? block.text.trim() : "";
      const box = normalizeBox(block.box);
      if (!text || !box) return null;
      return { ...block, text, box };
    })
    .filter(Boolean) as ExtractTextBlock[];

  if (!cleaned.length) return [];

  const enriched = cleaned.map((block) => {
    const area = block.box.w * block.box.h;
    const heightPx = block.box.h * imageHeight;
    const widthPx = block.box.w * imageWidth;
    return { block, area, heightPx, widthPx };
  });

  const biggest = enriched.reduce((acc, current) => Math.max(acc, current.area), 0);
  const relativeThreshold = biggest > 0 ? biggest * 0.12 : minAreaRatio;
  const keepArea = Math.max(minAreaRatio, relativeThreshold);

  return enriched
    .filter(({ area, heightPx }) => area >= keepArea && heightPx >= minHeightPx && heightPx / imageHeight >= minHeightRatio)
    .sort((a, b) => b.area - a.area)
    .slice(0, maxBlocks)
    .map(({ block }) => block);
};

