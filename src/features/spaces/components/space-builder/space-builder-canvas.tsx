import dynamic from "next/dynamic";
import { GripVertical } from "lucide-react";
import type { Layout } from "react-grid-layout";

import { cn } from "@/lib/utils";

import type { SpaceGridLayoutProps } from "@/features/spaces/components/space-grid-layout";
import { layoutFromBlocks } from "@/features/spaces/lib/space-layout";
import type { SpaceBlock } from "@/features/spaces/lib/space-document";
import type { SpaceBuilderMode } from "@/features/spaces/hooks/use-space-builder";
import { SpaceBlockPreview } from "@/features/spaces/components/space-builder/space-block-preview";

const SpaceGridLayout = dynamic<SpaceGridLayoutProps>(
  () => import("@/features/spaces/components/space-grid-layout").then((mod) => mod.SpaceGridLayout),
  { ssr: false },
);

type SpaceBuilderCanvasProps = {
  blocks: SpaceBlock[];
  mode: SpaceBuilderMode;
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onLayoutChange: (layout: Layout) => void;
};

export const SpaceBuilderCanvas = ({
  blocks,
  mode,
  selectedId,
  onSelectId,
  onLayoutChange,
}: SpaceBuilderCanvasProps) => {
  return (
    <div className="relative rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(236,72,153,0.12)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="relative overflow-x-auto overscroll-x-contain pb-2">
        <div className="min-w-[820px]">
          <SpaceGridLayout
            cols={4}
            rowHeight={140}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            draggableHandle=".space-drag-handle"
            isDraggable={mode === "edit"}
            isResizable={mode === "edit"}
            onLayoutChange={onLayoutChange}
            layout={layoutFromBlocks(blocks)}
          >
            {blocks.map((block) => {
              const isSelected = selectedId === block.id && mode === "edit";

              return (
                <div key={block.id} className="h-full">
                  <div
                    className={cn(
                      "group h-full relative rounded-2xl ring-1 ring-black/5 transition-shadow duration-200",
                      isSelected ? "ring-2 ring-primary/50 shadow-neon" : "hover:shadow-glow",
                    )}
                    onClick={() => {
                      if (mode !== "edit") return;
                      onSelectId(block.id);
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                      <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6">
                        <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/45 to-white/0 motion-safe:animate-[pigcasso-sheen_5.2s_ease-in-out_0ms_infinite]" />
                      </div>
                    </div>

                    {mode === "edit" ? (
                      <div
                        className={cn(
                          "space-drag-handle absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-white/60 bg-white/85 px-2 py-1 shadow-sm transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
                      >
                        <GripVertical className="size-4 text-muted-foreground" />
                      </div>
                    ) : null}

                    <SpaceBlockPreview block={block} />
                  </div>
                </div>
              );
            })}
          </SpaceGridLayout>
        </div>
      </div>
    </div>
  );
};

