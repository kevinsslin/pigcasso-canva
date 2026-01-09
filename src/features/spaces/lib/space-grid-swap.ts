import type { Layout, LayoutItem } from "react-grid-layout";

type LayoutRect = Pick<LayoutItem, "i" | "x" | "y" | "w" | "h">;

const intersects = (a: LayoutRect, b: LayoutRect) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

const intersectionArea = (a: LayoutRect, b: LayoutRect) => {
  if (!intersects(a, b)) return 0;
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
};

export type SpaceGridDragSwapResult = {
  layout: Layout;
  swappedWith: string | null;
};

export const applySpaceGridDragSwap = ({
  layout,
  oldItem,
  newItem,
  swapOrigin,
  lastSwappedWith,
}: {
  layout: Layout;
  oldItem: LayoutItem | null;
  newItem: LayoutItem | null;
  swapOrigin?: Pick<LayoutItem, "x" | "y"> | null;
  lastSwappedWith: string | null;
}): SpaceGridDragSwapResult => {
  const origin = swapOrigin ?? oldItem;

  if (!origin || !newItem) {
    return { layout, swappedWith: null };
  }

  const activeId = newItem.i;
  const active = { i: activeId, x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h } as LayoutRect;

  let bestCollision: LayoutRect | null = null;
  let bestScore = 0;

  for (const candidate of layout) {
    if (candidate.i === activeId) continue;
    const score = intersectionArea(active, candidate as LayoutRect);
    if (score <= 0) continue;
    if (score > bestScore) {
      bestScore = score;
      bestCollision = candidate as LayoutRect;
    }
  }

  if (!bestCollision) {
    return { layout, swappedWith: null };
  }

  if (bestCollision.i === lastSwappedWith) {
    return { layout, swappedWith: lastSwappedWith };
  }

  const nextLayout = layout.map((item) => {
    if (item.i === activeId) {
      return { ...item, x: bestCollision.x, y: bestCollision.y };
    }
    if (item.i === bestCollision.i) {
      return { ...item, x: origin.x, y: origin.y };
    }
    return item;
  });

  return { layout: nextLayout, swappedWith: bestCollision.i };
};
