import type { Layout } from "react-grid-layout";
import { correctBounds, getCompactor, moveElement } from "react-grid-layout/core";

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

const compactLayout = (layout: Layout, cols: number): Layout => {
  const nextLayout = toMutableLayout(layout, cols);
  const bounded = correctBounds(nextLayout as never, { cols });
  return getCompactor("vertical").compact(bounded, cols);
};

export const resolveLayoutCollisions = (layout: Layout, cols: number = SPACE_GRID_COLUMNS): Layout => {
  return compactLayout(layout, cols);
};

export const insertBlockAvoidingOverlap = (
  blocks: SpaceBlock[],
  block: SpaceBlock,
  cols: number = SPACE_GRID_COLUMNS,
): SpaceBlock[] => {
  const baseLayout = layoutFromBlocks(blocks);
  const bottomY = blocks.reduce((maxY, current) => Math.max(maxY, current.layout.y + current.layout.h), 0);
  const nextLayout = toMutableLayout(
    [
      ...baseLayout,
      {
        i: block.id,
        x: block.layout.x,
        y: bottomY,
        w: block.layout.w,
        h: block.layout.h,
      },
    ],
    cols,
  );

  correctBounds(nextLayout as never, { cols });

  const placed = nextLayout.find((item) => item.i === block.id);
  if (placed) {
    moveElement(nextLayout, placed, block.layout.x, block.layout.y, true, false, "vertical", cols, false);
  }

  const normalized = hasLayoutOverlap(nextLayout) ? resolveLayoutCollisions(nextLayout, cols) : compactLayout(nextLayout, cols);
  return applyLayoutToBlocks([...blocks, block], normalized);
};

export const normalizeBlocksLayout = (blocks: SpaceBlock[], cols: number = SPACE_GRID_COLUMNS): SpaceBlock[] => {
  const layout = layoutFromBlocks(blocks);
  const normalized = hasLayoutOverlap(layout) ? resolveLayoutCollisions(layout, cols) : compactLayout(layout, cols);
  return applyLayoutToBlocks(blocks, normalized);
};
