import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { verticalCompactor, type Layout } from "react-grid-layout";

import { cn } from "@/lib/utils";

import type { SpaceGridLayoutProps } from "@/features/spaces/components/space-grid-layout";
import { applyLayoutToBlocks, layoutFromBlocks, normalizeBlocksLayout } from "@/features/spaces/lib/space-layout";
import type { SpaceBlock } from "@/features/spaces/lib/space-document";
import type { SpaceBuilderMode } from "@/features/spaces/hooks/use-space-builder";
import { getSpaceModuleDragData } from "@/features/spaces/lib/space-dnd";
import { SPACE_GRID_COLUMNS, SPACE_GRID_GAP, SPACE_GRID_ROW_HEIGHT } from "@/features/spaces/lib/space-grid";
import { getSpaceModuleDefinition, type SpaceModuleDefinition } from "@/features/spaces/lib/space-modules";
import { SpaceBlockCard } from "@/features/spaces/components/space-public/space-block-card";

const SpaceGridLayout = dynamic<SpaceGridLayoutProps>(
  () => import("@/features/spaces/components/space-grid-layout").then((mod) => mod.SpaceGridLayout),
  { ssr: false },
);

type DroppedModulePlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type SpaceBuilderCanvasProps = {
  blocks: SpaceBlock[];
  handle: string;
  walletLabel: string | null;
  mode: SpaceBuilderMode;
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onDuplicateSelected?: () => void;
  onToggleVisibilitySelected?: () => void;
  onDeleteSelected?: () => void;
  onLayoutChange: (layout: Layout) => void;
  onDropModule: (module: SpaceModuleDefinition, placement: DroppedModulePlacement) => void;
};

export const SpaceBuilderCanvas = ({
  blocks,
  handle,
  walletLabel,
  mode,
  selectedId,
  onSelectId,
  onDuplicateSelected,
  onToggleVisibilitySelected,
  onDeleteSelected,
  onLayoutChange,
  onDropModule,
}: SpaceBuilderCanvasProps) => {
  const baseLayout = useMemo(() => layoutFromBlocks(blocks), [blocks]);
  const [draftLayout, setDraftLayout] = useState<Layout>(baseLayout);

  useEffect(() => {
    setDraftLayout(baseLayout);
  }, [baseLayout, mode]);

  const onLiveLayoutChange: SpaceGridLayoutProps["onLayoutChange"] = (layout) => {
    if (mode !== "edit") return;
    setDraftLayout(layout);
  };

  const commitLayout: SpaceGridLayoutProps["onDragStop"] = (layout) => {
    if (mode !== "edit") return;
    const nextBlocks = normalizeBlocksLayout(applyLayoutToBlocks(blocks, layout), SPACE_GRID_COLUMNS);
    const safeLayout = layoutFromBlocks(nextBlocks);
    setDraftLayout(safeLayout);
    onLayoutChange(safeLayout);
  };

  const onDropDragOver: SpaceGridLayoutProps["onDropDragOver"] = (event) => {
    if (mode !== "edit") return false;

    const moduleType = getSpaceModuleDragData(event.dataTransfer);
    if (!moduleType) return false;

    const moduleDef = getSpaceModuleDefinition(moduleType);
    if (!moduleDef) return false;

    return { w: moduleDef.defaultLayout.w, h: moduleDef.defaultLayout.h };
  };

  const onDrop: SpaceGridLayoutProps["onDrop"] = (layout, item, event) => {
    if (mode !== "edit") return;

    const moduleType = getSpaceModuleDragData((event as DragEvent).dataTransfer ?? null);
    if (!moduleType) return;

    const moduleDef = getSpaceModuleDefinition(moduleType);
    if (!moduleDef) return;

    setDraftLayout(layout);
    onLayoutChange(layout);

    const placement: DroppedModulePlacement = {
      x: item?.x ?? 0,
      y: item?.y ?? 0,
      w: item?.w ?? moduleDef.defaultLayout.w,
      h: item?.h ?? moduleDef.defaultLayout.h,
    };

    onDropModule(moduleDef, placement);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-soft backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-[0.9] [background-image:radial-gradient(circle,rgba(236,72,153,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="relative flex-1 min-h-0 overflow-auto overscroll-contain px-3 py-3">
        {blocks.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-10 text-center">
            <div className="max-w-sm rounded-3xl border border-white/70 bg-white/70 px-6 py-6 shadow-soft backdrop-blur">
              <div className="text-sm font-extrabold tracking-tight text-gray-900">Drop modules here</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Drag modules from the left panel or click a module to add it.
              </div>
            </div>
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-6xl pb-28 sm:pb-12">
          <SpaceGridLayout
            cols={SPACE_GRID_COLUMNS}
            rowHeight={SPACE_GRID_ROW_HEIGHT}
            margin={[SPACE_GRID_GAP, SPACE_GRID_GAP]}
            containerPadding={[0, 0]}
            draggableHandle=".space-drag-handle"
            isDraggable={mode === "edit"}
            isResizable={mode === "edit"}
            isBounded
            compactor={verticalCompactor}
            onDragStop={commitLayout}
            onResizeStop={commitLayout}
            onLayoutChange={onLiveLayoutChange}
            layout={draftLayout}
            dropConfig={{ enabled: mode === "edit", defaultItem: { w: 1, h: 1 } }}
            onDrop={onDrop}
            onDropDragOver={onDropDragOver}
          >
            {blocks.map((block) => {
              const isSelected = selectedId === block.id && mode === "edit";
              const isHidden = mode === "edit" && !block.isVisible;

              return (
                <div key={block.id} className="h-full">
                  <div
                    className={cn(
                      "group relative h-full rounded-3xl transition-shadow duration-200",
                      isHidden ? "opacity-75" : null,
                      isSelected ? "ring-2 ring-primary/50 shadow-neon" : "hover:ring-1 hover:ring-primary/25 hover:shadow-glow",
                    )}
                    onClick={() => {
                      if (mode !== "edit") return;
                      onSelectId(block.id);
                    }}
                  >
                    {isHidden ? (
                      <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] font-bold tracking-wide text-gray-700 shadow-sm">
                        Hidden
                      </div>
                    ) : null}

                    {mode === "edit" && isSelected ? (
                      <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
                        {onToggleVisibilitySelected ? (
                          <button
                            type="button"
                            className="inline-flex size-9 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-gray-700 shadow-soft transition hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleVisibilitySelected();
                            }}
                            title={block.isVisible ? "Hide module" : "Show module"}
                          >
                            {block.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        ) : null}
                        {onDuplicateSelected ? (
                          <button
                            type="button"
                            className="inline-flex size-9 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-gray-700 shadow-soft transition hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDuplicateSelected();
                            }}
                            title="Duplicate module"
                          >
                            <Copy className="size-4" />
                          </button>
                        ) : null}
                        {onDeleteSelected ? (
                          <button
                            type="button"
                            className="inline-flex size-9 items-center justify-center rounded-2xl border border-white/70 bg-white/85 text-red-600 shadow-soft transition hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteSelected();
                            }}
                            title="Delete module"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {mode === "edit" ? (
                      <div
                        className={cn(
                          "space-drag-handle absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-white/60 bg-white/85 px-2 py-1 shadow-sm transition-opacity",
                          isSelected
                            ? "opacity-100"
                            : "opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100",
                        )}
                      >
                        <GripVertical className="size-4 text-muted-foreground" />
                      </div>
                    ) : null}

                    <SpaceBlockCard block={block} handle={handle} walletLabel={walletLabel} interactive={false} />
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
