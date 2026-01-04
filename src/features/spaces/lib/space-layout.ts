import type { Layout } from "react-grid-layout";
import { correctBounds, getCompactor } from "react-grid-layout/core";

import type { SpaceBlock } from "@/features/spaces/lib/space-document";
import { SPACE_GRID_COLUMNS } from "@/features/spaces/lib/space-grid";

export const layoutFromBlocks = (blocks: SpaceBlock[]): Layout =>
  blocks.map((block) => ({
    i: block.id,
    x: block.layout.x,
    y: block.layout.y,
    w: block.layout.w,
    h: block.layout.h,
  }));

export const applyLayoutToBlocks = (blocks: SpaceBlock[], layout: Layout) => {
  const byId = new Map(layout.map((item) => [item.i, item]));

  return blocks.map((block) => {
    const next = byId.get(block.id);
    if (!next) return block;

    return {
      ...block,
      layout: { ...block.layout, x: next.x, y: next.y, w: next.w, h: next.h },
    };
  });
};

export const getNextRowY = (blocks: SpaceBlock[]) =>
  blocks.reduce((maxY, block) => Math.max(maxY, block.layout.y + block.layout.h), 0);

type LayoutRect = Pick<Layout[number], "i" | "x" | "y" | "w" | "h">;

export const hasLayoutOverlap = (layout: Layout): boolean => {
  for (let i = 0; i < layout.length; i += 1) {
    const a = layout[i] as LayoutRect | undefined;
    if (!a) continue;
    for (let j = i + 1; j < layout.length; j += 1) {
      const b = layout[j] as LayoutRect | undefined;
      if (!b) continue;
      const overlaps =
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
      if (overlaps) return true;
    }
  }

  return false;
};

const toMutableLayout = (layout: Layout, cols: number): Layout => {
  return layout.map((item) => {
    const w = Math.max(1, Math.min(Math.floor(item.w), cols));
    const h = Math.max(1, Math.floor(item.h));
    const x = Math.max(0, Math.min(Math.floor(item.x), cols - w));
    const y = Math.max(0, Math.floor(item.y));

    return { ...item, x, y, w, h };
  });
};

const correctLayoutBounds = (layout: Layout, cols: number): Layout => {
  const nextLayout = toMutableLayout(layout, cols);
  return correctBounds(nextLayout as never, { cols });
};

const compactLayout = (layout: Layout, cols: number): Layout => {
  const bounded = correctLayoutBounds(layout, cols);
  return getCompactor("vertical").compact(bounded, cols);
};

export const resolveLayoutCollisions = (layout: Layout, cols: number = SPACE_GRID_COLUMNS): Layout => {
  const bounded = correctLayoutBounds(layout, cols);
  const sorted = [...bounded].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: LayoutRect[] = [];
  const resolved: LayoutRect[] = [];

  const overlaps = (a: LayoutRect, b: LayoutRect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  for (const item of sorted) {
    const candidate: LayoutRect = { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h };
    let guard = 0;

    while (guard < 10_000 && placed.some((placedItem) => overlaps(placedItem, candidate))) {
      candidate.y += 1;
      guard += 1;
    }

    placed.push(candidate);
    resolved.push(candidate);
  }

  return resolved;
};

export const insertBlockAvoidingOverlap = (
  blocks: SpaceBlock[],
  block: SpaceBlock,
  cols: number = SPACE_GRID_COLUMNS,
): SpaceBlock[] => {
  const baseBlocks = normalizeBlocksLayout(blocks, cols, { compact: false });
  const layout = correctLayoutBounds(layoutFromBlocks(baseBlocks), cols);

  const clampPreferred = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  const preferredW = Math.max(1, Math.min(Math.floor(block.layout.w), cols));
  const preferredH = Math.max(1, Math.floor(block.layout.h));
  const preferredX = clampPreferred(Math.floor(block.layout.x), 0, cols - preferredW);
  const preferredY = Math.max(0, Math.floor(block.layout.y));

  const overlaps = (a: LayoutRect, b: LayoutRect) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const candidate: LayoutRect = { i: block.id, x: preferredX, y: preferredY, w: preferredW, h: preferredH };
  let guard = 0;

  while (guard < 10_000 && layout.some((item) => overlaps(item as LayoutRect, candidate))) {
    candidate.y += 1;
    guard += 1;
  }

  const nextBlock: SpaceBlock = {
    ...block,
    layout: { ...block.layout, x: candidate.x, y: candidate.y, w: candidate.w, h: candidate.h },
  };

  return normalizeBlocksLayout([...baseBlocks, nextBlock], cols, { compact: false });
};

export const normalizeBlocksLayout = (
  blocks: SpaceBlock[],
  cols: number = SPACE_GRID_COLUMNS,
  options?: { compact?: boolean },
): SpaceBlock[] => {
  const layout = layoutFromBlocks(blocks);
  const bounded = correctLayoutBounds(layout, cols);
  const shouldCompact = options?.compact ?? false;

  const normalized = hasLayoutOverlap(bounded)
    ? resolveLayoutCollisions(bounded, cols)
    : shouldCompact
      ? compactLayout(bounded, cols)
      : bounded;
  return applyLayoutToBlocks(blocks, normalized);
};
