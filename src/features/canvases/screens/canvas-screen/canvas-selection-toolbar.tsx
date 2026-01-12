"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  AtSign,
  ChevronDown,
  Code2,
  Coins,
  Download,
  Layers3,
  RefreshCcw,
  Rocket,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    }
  | {
      kind: "group";
      screenX: number;
      screenY: number;
      shapeId: string;
    };

export const CanvasSelectionToolbar = ({
  anchor,
  disabled,
  onAddToChat,
  onBringForward,
  onBringToFront,
  onDownloadSelected,
  onDownloadSelectedHtml,
  onMintNft,
  onLaunchPrintr,
  showLaunchPrintr = true,
  launchPrintrLabel = "Launch on Printr",
  showMintNft = true,
  mintNftLabel = "Export NFT",
  onRegenerate,
  onRemoveBackground,
  onMakeTextEditable,
  onSendBackward,
  onSendToBack,
  onViewHtmlCode,
  onUngroup,
  textStyle,
  onUpdateTextStyle,
}: {
  anchor: CanvasSelectionToolbarAnchor | null;
  disabled: boolean;
  onAddToChat: () => void;
  onBringForward: () => void;
  onBringToFront: () => void;
  onDownloadSelected: () => void;
  onDownloadSelectedHtml: () => void;
  onMintNft: () => void;
  onLaunchPrintr: () => void;
  showLaunchPrintr?: boolean;
  launchPrintrLabel?: string;
  showMintNft?: boolean;
  mintNftLabel?: string;
  onRegenerate: () => void;
  onRemoveBackground: () => void;
  onMakeTextEditable: () => void;
  onSendBackward: () => void;
  onSendToBack: () => void;
  onViewHtmlCode: () => void;
  onUngroup: () => void;
  textStyle: { font: string; size: string; color: string; sizePx: number; fontFamily: string | null } | null;
  onUpdateTextStyle: (
    partial: Partial<{ font: string; size: string; color: string; sizePx: number; fontFamily: string | null }>,
  ) => void;
}) => {
  const [customFontDialogOpen, setCustomFontDialogOpen] = useState(false);
  const [customFontFamilyDraft, setCustomFontFamilyDraft] = useState("");

  const formatFontFamilyLabel = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "Custom";
    const first = trimmed.split(",")[0]?.trim() ?? trimmed;
    return first.replace(/^["']|["']$/g, "") || "Custom";
  }, []);

  useEffect(() => {
    if (!customFontDialogOpen) return;
    if (anchor?.kind !== "text" || !textStyle) return;
    setCustomFontFamilyDraft(textStyle.fontFamily ?? "");
  }, [anchor?.kind, customFontDialogOpen, textStyle]);

  const resolvedFontLabel = useMemo(() => {
    if (anchor?.kind !== "text" || !textStyle) return null;
    if (textStyle.fontFamily) {
      return (
        TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.value === textStyle.fontFamily)?.label ??
        formatFontFamilyLabel(textStyle.fontFamily)
      );
    }
    return TEXT_FONT_OPTIONS.find((opt) => opt.id === textStyle.font)?.label ?? "Font";
  }, [anchor?.kind, formatFontFamilyLabel, textStyle]);

  const resolvedFontValue = useMemo(() => {
    if (anchor?.kind !== "text" || !textStyle) return "__none__";
    if (textStyle.fontFamily) {
      const preset = TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.value === textStyle.fontFamily);
      if (preset?.id === "serif") return "base:serif";
      if (preset?.id === "mono") return "base:mono";
      return preset ? `preset:${preset.id}` : "__custom__";
    }
    return `base:${textStyle.font}`;
  }, [anchor?.kind, textStyle]);

  if (!anchor) return null;

  const isImage = anchor.kind === "image";
  const isHtml = anchor.kind === "html";
  const isText = anchor.kind === "text";
  const isGroup = anchor.kind === "group";

  return (
    <div
      className="fixed z-40 max-w-[calc(100vw-24px)] rounded-2xl border bg-card/90 backdrop-blur shadow-soft px-2 py-2"
      style={{ left: anchor.screenX, top: anchor.screenY }}
    >
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 rounded-full px-3"
          disabled={disabled}
          onClick={onAddToChat}
          aria-label="Add selection to chat"
        >
          <AtSign className="size-4" />
          <span className="ml-2">Add to chat</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              aria-label="Layer order"
            >
              <Layers3 className="size-4" />
              <span className="ml-2">Order</span>
              <ChevronDown className="ml-2 size-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel>Layer order</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onBringToFront} disabled={disabled}>
              <ArrowUpToLine className="mr-2 size-4" />
              Bring to front
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBringForward} disabled={disabled}>
              <ArrowUp className="mr-2 size-4" />
              Bring forward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSendBackward} disabled={disabled}>
              <ArrowDown className="mr-2 size-4" />
              Send backward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSendToBack} disabled={disabled}>
              <ArrowDownToLine className="mr-2 size-4" />
              Send to back
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isGroup ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onUngroup}
              aria-label="Ungroup selection"
            >
              <Layers3 className="mr-2 size-4" />
              Ungroup
            </Button>

            {showMintNft ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 rounded-full px-3"
                disabled={disabled}
                onClick={onMintNft}
                aria-label="Mint NFT"
              >
                <Coins className="mr-2 size-4" />
                {mintNftLabel}
              </Button>
            ) : null}

            {showLaunchPrintr ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 rounded-full px-3"
                disabled={disabled}
                onClick={onLaunchPrintr}
                aria-label="Launch on Printr"
              >
                <Rocket className="mr-2 size-4" />
                {launchPrintrLabel}
              </Button>
            ) : null}
          </>
        ) : null}

        {isImage ? (
          <>
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
              variant="secondary"
              size="sm"
              className="h-9 rounded-full px-3"
              disabled={disabled}
              onClick={onMintNft}
              aria-label="Mint NFT"
            >
              <Coins className="mr-2 size-4" />
              {mintNftLabel}
            </Button>

            {showLaunchPrintr ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 rounded-full px-3"
                disabled={disabled}
                onClick={onLaunchPrintr}
                aria-label="Launch on Printr"
              >
                <Rocket className="mr-2 size-4" />
                {launchPrintrLabel}
              </Button>
            ) : null}

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
                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">
                  Recommended
                </div>
                <DropdownMenuRadioGroup
                  value={resolvedFontValue}
                  onValueChange={(value) => {
                    if (value === "__custom__") {
                      setCustomFontDialogOpen(true);
                      return;
                    }

                    if (value.startsWith("preset:")) {
                      const presetId = value.slice("preset:".length);
                      const preset = TEXT_FONT_FAMILY_PRESETS.find((opt) => opt.id === presetId);
                      if (!preset) return;
                      const font = preset.id === "serif" ? "serif" : preset.id === "mono" ? "mono" : "sans";
                      onUpdateTextStyle({ font, fontFamily: preset.value });
                      return;
                    }
                  }}
                >
                  {TEXT_FONT_FAMILY_PRESETS.filter((opt) => opt.id !== "serif" && opt.id !== "mono").map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={`preset:${opt.id}`}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                  {textStyle.fontFamily && !TEXT_FONT_FAMILY_PRESETS.some((opt) => opt.value === textStyle.fontFamily) ? (
                    <DropdownMenuRadioItem
                      value="__custom__"
                      onSelect={() => setCustomFontDialogOpen(true)}
                    >
                      Custom: {formatFontFamilyLabel(textStyle.fontFamily)}
                    </DropdownMenuRadioItem>
                  ) : null}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">
                  Built-in
                </div>
                <DropdownMenuRadioGroup
                  value={resolvedFontValue}
                  onValueChange={(value) => {
                    if (!value.startsWith("base:")) return;
                    const font = value.slice("base:".length);
                    onUpdateTextStyle({ font, fontFamily: null });
                  }}
                >
                  {TEXT_FONT_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={`base:${opt.id}`}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setCustomFontDialogOpen(true)}
              >
                {resolvedFontValue === "__custom__" ? "Edit custom font…" : "Custom font…"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onUpdateTextStyle({ font: "draw", fontFamily: null })}
              >
                Reset font
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

      {isText && textStyle ? (
        <Dialog open={customFontDialogOpen} onOpenChange={setCustomFontDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Custom font</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">
                Set a CSS font-family string.
              </div>
              <Input
                value={customFontFamilyDraft}
                placeholder='e.g. "Inter", system-ui'
                disabled={disabled}
                onChange={(event) => setCustomFontFamilyDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  const value = customFontFamilyDraft.trim();
                  onUpdateTextStyle(value ? { font: "sans", fontFamily: value } : { fontFamily: null });
                  setCustomFontDialogOpen(false);
                }}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                disabled={disabled}
                onClick={() => setCustomFontDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={disabled}
                onClick={() => {
                  const value = customFontFamilyDraft.trim();
                  onUpdateTextStyle(value ? { font: "sans", fontFamily: value } : { fontFamily: null });
                  setCustomFontDialogOpen(false);
                }}
              >
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};
