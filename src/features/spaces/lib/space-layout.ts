import type { Layout } from "react-grid-layout";

import type { SpaceBlock } from "@/features/spaces/lib/space-document";

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

