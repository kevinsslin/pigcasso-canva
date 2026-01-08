"use client";

import type { ReactNode, Ref } from "react";
import GridLayout, { useContainerWidth, type GridLayoutProps, type Layout } from "react-grid-layout";

import { cn } from "@/lib/utils";

import styles from "./space-grid-layout.module.css";

export type SpaceGridLayoutProps = {
  layout: Layout;
  onLayoutChange?: (layout: Layout) => void;
  cols: number;
  rowHeight: number;
  margin: readonly [number, number];
  containerPadding: readonly [number, number];
  isDraggable: boolean;
  isResizable: boolean;
  isBounded?: boolean;
  draggableHandle?: string;
  dropConfig?: GridLayoutProps["dropConfig"];
  droppingItem?: GridLayoutProps["droppingItem"];
  onDrop?: GridLayoutProps["onDrop"];
  onDropDragOver?: GridLayoutProps["onDropDragOver"];
  onDragStart?: GridLayoutProps["onDragStart"];
  onDrag?: GridLayoutProps["onDrag"];
  onDragStop?: GridLayoutProps["onDragStop"];
  onResizeStop?: GridLayoutProps["onResizeStop"];
  compactor?: GridLayoutProps["compactor"];
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
  isBounded,
  draggableHandle,
  dropConfig,
  droppingItem,
  onDrop,
  onDropDragOver,
  onDragStart,
  onDrag,
  onDragStop,
  onResizeStop,
  compactor,
  children,
  className,
}: SpaceGridLayoutProps) => {
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: false,
    initialWidth: 1024,
  });

  return (
    <div ref={containerRef as unknown as Ref<HTMLDivElement>} className={cn(styles.layout, className)}>
      {mounted ? (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols, rowHeight, margin, containerPadding, maxRows: Infinity }}
          dragConfig={{
            enabled: isDraggable,
            bounded: isBounded ?? false,
            threshold: 4,
            handle: draggableHandle,
            cancel: "button, a, input, textarea, select, option",
          }}
          resizeConfig={{
            enabled: isResizable,
            handles: ["n", "s", "e", "w", "ne", "nw", "se", "sw"],
          }}
          dropConfig={dropConfig}
          droppingItem={droppingItem}
          compactor={compactor}
          onLayoutChange={onLayoutChange}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onResizeStop={onResizeStop}
          onDrop={onDrop}
          onDropDragOver={onDropDragOver}
        >
          {children}
        </GridLayout>
      ) : null}
    </div>
  );
};
