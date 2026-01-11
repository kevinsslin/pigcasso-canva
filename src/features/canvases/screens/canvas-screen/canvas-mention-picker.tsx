"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type CanvasMentionPickerAnchor = { screenX: number; screenY: number } | null;

export type CanvasMentionPickerItem = {
  shapeId: string;
  label: string;
  type: string;
};

export const CanvasMentionPicker = ({
  anchor,
  query,
  items,
  onClose,
  onPick,
}: {
  anchor: CanvasMentionPickerAnchor;
  query?: string | null;
  items: CanvasMentionPickerItem[];
  onClose: () => void;
  onPick: (item: CanvasMentionPickerItem) => void;
}) => {
  if (!anchor) return null;

  return (
    <div
      className="fixed z-[70] w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border bg-card/95 backdrop-blur shadow-soft p-2"
      style={{ left: anchor.screenX, top: anchor.screenY }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs font-semibold text-muted-foreground">
          Insert canvas reference{query ? ` • “${query}”` : ""}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close mention picker"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-2 max-h-[210px] overflow-auto space-y-1 px-1">
        {items.length ? (
          items.map((item) => (
            <button
              key={item.shapeId}
              type="button"
              className="w-full rounded-xl border bg-background/60 px-3 py-2 text-left hover:bg-background transition"
              onClick={() => onPick(item)}
            >
              <div className="text-sm font-medium truncate">@{item.label}</div>
              <div className="text-xs text-muted-foreground truncate">{item.type}</div>
            </button>
          ))
        ) : (
          <div className="rounded-xl border bg-background/60 p-3 text-sm text-muted-foreground">
            No matching items on this board.
          </div>
        )}
      </div>
    </div>
  );
};

