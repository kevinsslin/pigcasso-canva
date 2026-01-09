"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const EditableBoardTitle = ({
  name,
  disabled = false,
  label = "Board",
  className,
  onRename,
}: {
  name: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  onRename: (nextName: string) => Promise<void> | void;
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const raf = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [editing]);

  const cancelEdit = () => {
    setEditing(false);
  };

  const submitRename = async () => {
    if (saving) return;
    const raw = inputRef.current?.value ?? name;
    const trimmed = raw.trim();

    if (!trimmed || trimmed === name) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onRename(trimmed);
      setEditing(false);
    } catch {
      // keep editing on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-1 text-sm font-semibold text-muted-foreground", className)}>
      <span>{label}</span>
      <span className="text-foreground">•</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            defaultValue={name}
            minLength={1}
            maxLength={80}
            disabled={disabled || saving}
            placeholder="Board name"
            className="h-8 w-[220px] px-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
              if (event.key === "Enter") {
                event.preventDefault();
                void submitRename();
              }
            }}
            data-testid="editable-board-title-input"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => void submitRename()}
            disabled={disabled || saving}
            aria-label="Save board name"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={cancelEdit}
            disabled={disabled || saving}
            aria-label="Cancel rename"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 max-w-[220px] justify-start gap-2 px-2 text-foreground"
          onClick={() => setEditing(true)}
          disabled={disabled}
          aria-label="Rename board"
          data-testid="editable-board-title-trigger"
        >
          <span className="truncate">{name}</span>
          <Pencil className="size-3 text-muted-foreground shrink-0" />
        </Button>
      )}
    </div>
  );
};
