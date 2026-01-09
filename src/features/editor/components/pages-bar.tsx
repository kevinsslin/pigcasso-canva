"use client";

import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

export type PageBarItem = {
  id: string;
  index: number;
  name: string | null;
  width: number;
  height: number;
};

type PagesBarProps = {
  pages: PageBarItem[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onDeletePage: (pageId: string) => void;
  disabled?: boolean;
};

export const PagesBar = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  disabled,
}: PagesBarProps) => {
  const canDelete = pages.length > 1;

  return (
    <div className="border-t border-border/60 bg-card/80 backdrop-blur px-2 py-2 flex items-center gap-2 overflow-x-auto">
      {pages.map((page) => {
        const active = page.id === activePageId;
        const label = page.name?.trim() || `Page ${page.index + 1}`;

        return (
          <div
            key={page.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg border px-2 py-1 shrink-0",
              active ? "border-primary bg-primary/5" : "border-border bg-background",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectPage(page.id)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 text-left",
                disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer",
              )}
            >
              <div
                className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center text-xs font-semibold",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {page.index + 1}
              </div>
              <div className="min-w-0">
                <div className={cn("text-xs font-medium truncate", active ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {page.width}×{page.height}
                </div>
              </div>
            </button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7 rounded-full ml-1",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              disabled={disabled || !canDelete}
              onClick={() => onDeletePage(page.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full shrink-0"
        disabled={disabled}
        onClick={onAddPage}
      >
        <Plus className="size-4 mr-2" />
        Add page
      </Button>
    </div>
  );
};
