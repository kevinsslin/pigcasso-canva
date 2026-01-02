"use client";

import type { ReactNode, Ref } from "react";
import GridLayout, { useContainerWidth, type Layout } from "react-grid-layout";

export type SpaceGridLayoutProps = {
  layout: Layout;
  onLayoutChange: (layout: Layout) => void;
  cols: number;
  rowHeight: number;
  margin: readonly [number, number];
  containerPadding: readonly [number, number];
  isDraggable: boolean;
  isResizable: boolean;
  draggableHandle?: string;
  children: ReactNode;
  className?: string;
};

export const SpaceGridLayout = ({
  layout,
  onLayoutChange,
  cols,
  rowHeight,
  margin,
  containerPadding,
  isDraggable,
  isResizable,
  draggableHandle,
  children,
  className,
}: SpaceGridLayoutProps) => {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: false,
    initialWidth: 1024,
  });

  return (
    <div ref={containerRef as unknown as Ref<HTMLDivElement>} className={className}>
      {mounted ? (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols, rowHeight, margin, containerPadding, maxRows: Infinity }}
          dragConfig={{
            enabled: isDraggable,
            bounded: false,
            threshold: 6,
            handle: draggableHandle,
          }}
          resizeConfig={{
            enabled: isResizable,
            handles: ["se", "e", "s"],
          }}
          onLayoutChange={onLayoutChange}
        >
          {children}
        </GridLayout>
      ) : null}
    </div>
  );
};
