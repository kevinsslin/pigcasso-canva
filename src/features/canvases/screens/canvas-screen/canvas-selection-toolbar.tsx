"use client";

import { AtSign, ChevronDown, Code2, Download, Layers3, RefreshCcw, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TEXT_COLOR_OPTIONS, TEXT_FONT_FAMILY_PRESETS, TEXT_FONT_OPTIONS, TEXT_SIZE_OPTIONS } from "@/features/canvases/lib/text-style";

export type CanvasSelectionToolbarAnchor =
  | {
      kind: "image";
      screenX: number;
      screenY: number;
      shapeId: string;
    }
  | {
      kind: "html";
      screenX: number;
      screenY: number;
      shapeId: string;
    }
  | {
      kind: "text";
      screenX: number;
      screenY: number;
      shapeId: string;
    };

export const CanvasSelectionToolbar = ({
  anchor,
  disabled,
  onAddToChat,
  onEditWithAi,
  onDownloadSelected,
  onDownloadSelectedHtml,
  onRegenerate,
  onRemoveBackground,
  onMakeTextEditable,
  onViewHtmlCode,
  textStyle,
  onUpdateTextStyle,
}: {
  anchor: CanvasSelectionToolbarAnchor | null;
  disabled: boolean;
  onAddToChat: () => void;
  onEditWithAi: () => void;
  onDownloadSelected: () => void;
  onDownloadSelectedHtml: () => void;
  onRegenerate: () => void;
  onRemoveBackground: () => void;
  onMakeTextEditable: () => void;
  onViewHtmlCode: () => void;
  textStyle: { font: string; size: string; color: string; sizePx: number; fontFamily: string | null } | null;
  onUpdateTextStyle: (
    partial: Partial<{ font: string; size: string; color: string; sizePx: number; fontFamily: string | null }>,
  ) => void;
}) => {
  if (!anchor) return null;

  const isImage = anchor.kind === "image";
  const isHtml = anchor.kind === "html";
  const isText = anchor.kind === "text";

  const resolvedFontLabel = (() => {
    if (!isText || !textStyle) return null;
    if (textStyle.fontFamily) {
      return TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.value === textStyle.fontFamily)?.label ?? "Custom";
    }
    return TEXT_FONT_OPTIONS.find((opt) => opt.id === textStyle.font)?.label ?? "Font";
  })();

  const resolvedFontValue = (() => {
    if (!isText || !textStyle) return "__none__";
    if (textStyle.fontFamily) {
      const preset = TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.value === textStyle.fontFamily);
      if (preset?.id === "serif") return "base:serif";
      if (preset?.id === "mono") return "base:mono";
      return preset ? `preset:${preset.id}` : "__custom__";
    }
    return `base:${textStyle.font}`;
  })();

  return (
    <div
      className="fixed z-[12000] max-w-[calc(100vw-24px)] rounded-2xl border bg-card/90 backdrop-blur shadow-soft px-2 py-2"
      style={{ left: anchor.screenX, top: anchor.screenY }}
    >
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          disabled={disabled}
          onClick={onAddToChat}
          aria-label="Add selection to chat"
        >
          <AtSign className="size-4" />
        </Button>

        {isImage ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onEditWithAi}
              aria-label="Edit selected image"
            >
              <Sparkles className="mr-2 size-4" />
              Edit
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onRegenerate}
              aria-label="Regenerate selected image"
            >
              <RefreshCcw className="mr-2 size-4" />
              Regenerate
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onRemoveBackground}
              aria-label="Remove background"
            >
              <Wand2 className="mr-2 size-4" />
              Remove BG
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onMakeTextEditable}
              aria-label="Separate layers"
            >
              <Layers3 className="mr-2 size-4" />
              Separate layers
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={disabled}
              onClick={onDownloadSelected}
              aria-label="Download selected image"
            >
              <Download className="size-4" />
            </Button>
          </>
        ) : null}

        {isHtml ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onViewHtmlCode}
              aria-label="View HTML code"
            >
              <Code2 className="mr-2 size-4" />
              Code
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              disabled={disabled}
              onClick={onDownloadSelectedHtml}
              aria-label="Download HTML"
            >
              <Download className="size-4" />
            </Button>
          </>
        ) : null}

        {isText && textStyle ? (
          <>
            <div className="h-6 w-px bg-border/60 mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={disabled}
                >
                  <span className="text-xs font-semibold">
                    {resolvedFontLabel}
                  </span>
                  <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-72">
                <DropdownMenuLabel>Font</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={resolvedFontValue}
                  onValueChange={(value) => {
                    if (value === "__custom__") return;
                    if (value.startsWith("preset:")) {
                      const presetId = value.slice("preset:".length);
                      const preset = TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.id === presetId);
                      if (!preset) return;
                      const font = preset.id === "serif" ? "serif" : preset.id === "mono" ? "mono" : "sans";
                      onUpdateTextStyle({ font, fontFamily: preset.value });
                      return;
                    }

                    if (value.startsWith("base:")) {
                      const font = value.slice("base:".length);
                      onUpdateTextStyle({ font, fontFamily: null });
                    }
                  }}
                >
                  {TEXT_FONT_FAMILY_PRESETS.filter((opt) => opt.id !== "serif" && opt.id !== "mono").map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={`preset:${opt.id}`}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}

                  {textStyle.fontFamily && !TEXT_FONT_FAMILY_PRESETS.some((opt) => opt.value === textStyle.fontFamily) ? (
                    <DropdownMenuRadioItem value="__custom__">Custom</DropdownMenuRadioItem>
                  ) : null}

                  {TEXT_FONT_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={`base:${opt.id}`}>
                      Default {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />
                <div className="p-2 space-y-1">
                  <div className="text-[11px] font-semibold text-muted-foreground">Custom font-family</div>
                  <Input
                    key={`${anchor.shapeId}:${textStyle.fontFamily ?? ""}`}
                    placeholder='e.g. "Inter", system-ui'
                    defaultValue={textStyle.fontFamily ?? ""}
                    disabled={disabled}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const value = (event.currentTarget as HTMLInputElement).value;
                      onUpdateTextStyle({ font: "sans", fontFamily: value });
                    }}
                    onBlur={(event) => {
                      const value = event.currentTarget.value;
                      onUpdateTextStyle({ font: "sans", fontFamily: value });
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  />
                </div>

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onUpdateTextStyle({ fontFamily: null });
                  }}
                >
                  Reset to default
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={disabled}
                >
                  <span className="text-xs font-semibold">
                    {textStyle.sizePx ? `${textStyle.sizePx}px` : TEXT_SIZE_OPTIONS.find((opt) => opt.id === textStyle.size)?.label ?? "Size"}
                  </span>
                  <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel>Size</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-1">
                  <div className="text-[11px] font-semibold text-muted-foreground">Custom (px)</div>
                  <Input
                    key={`${anchor.shapeId}:${textStyle.sizePx}`}
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={textStyle.sizePx}
                    disabled={disabled}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      const value = Number((event.currentTarget as HTMLInputElement).value);
                      if (!Number.isFinite(value) || value <= 0) return;
                      onUpdateTextStyle({ sizePx: value });
                    }}
                    onBlur={(event) => {
                      const value = Number(event.currentTarget.value);
                      if (!Number.isFinite(value) || value <= 0) return;
                      onUpdateTextStyle({ sizePx: value });
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={textStyle.size}
                  onValueChange={(value) => onUpdateTextStyle({ size: value })}
                >
                  {TEXT_SIZE_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full px-3"
                  disabled={disabled}
                >
                  <span className="text-xs font-semibold">Color</span>
                  <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuLabel>Color</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="grid grid-cols-5 gap-2 p-2">
                  {TEXT_COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded-full border border-border/60 transition hover:scale-[1.03]",
                        opt.className,
                        textStyle.color === opt.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : undefined,
                      )}
                      onClick={() => onUpdateTextStyle({ color: opt.id })}
                      aria-label={`Set text color to ${opt.label}`}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>
    </div>
  );
};
