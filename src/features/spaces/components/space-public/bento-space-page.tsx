import type { SpaceDocument } from "@/features/spaces/lib/space-document";

import { SpaceBlockCard } from "@/features/spaces/components/space-public/space-block-card";

const SPACE_GRID_COLUMNS = 4;
const SPACE_ROW_HEIGHT = 140;
const SPACE_GAP = 16;

const getSafeGridPlacement = (block: SpaceDocument["blocks"][number]) => {
  const w = Math.max(1, Math.min(block.layout.w, SPACE_GRID_COLUMNS));
  const x = Math.max(0, Math.min(block.layout.x, SPACE_GRID_COLUMNS - w));
  const y = Math.max(0, block.layout.y);
  const h = Math.max(1, block.layout.h);

  return { x, y, w, h };
};

const getStackedMinHeight = (heightUnits: number) => {
  const units = Math.max(1, heightUnits);
  return units * SPACE_ROW_HEIGHT + (units - 1) * SPACE_GAP;
};

export const BentoSpacePage = ({
  handle,
  walletLabel,
  document,
}: {
  handle: string;
  walletLabel: string | null;
  document: SpaceDocument;
}) => {
  const visibleBlocks = document.blocks.filter((block) => block.isVisible);
  const stackedBlocks = [...visibleBlocks].sort((a, b) => (a.layout.y - b.layout.y) || (a.layout.x - b.layout.x));

  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <div className="rounded-3xl border border-white/60 bg-white/60 p-4 shadow-soft backdrop-blur sm:p-6">
        <div className="hidden gap-4 md:grid md:grid-cols-4 md:auto-rows-[140px]">
          {visibleBlocks.map((block) => {
            const placement = getSafeGridPlacement(block);
            return (
              <div
                key={block.id}
                className="h-full"
                style={{
                  gridColumn: `${placement.x + 1} / span ${placement.w}`,
                  gridRow: `${placement.y + 1} / span ${placement.h}`,
                }}
              >
                <SpaceBlockCard block={block} handle={handle} walletLabel={walletLabel} />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:hidden">
          {stackedBlocks.map((block) => (
            <div key={block.id} style={{ minHeight: getStackedMinHeight(block.layout.h) }}>
              <SpaceBlockCard block={block} handle={handle} walletLabel={walletLabel} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

