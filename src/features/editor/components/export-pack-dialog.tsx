"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { usePro } from "@/features/auth/hooks/use-pro";
import {
  DEFAULT_PACK_PRESET_KEYS,
  WEB3_PRESETS,
  Web3PresetKey,
} from "@/features/editor/web3-presets";
import {
  downloadBlob,
  exportPack,
  sanitizeFileSegment,
} from "@/features/editor/pack-export";
import type { Editor } from "@/features/editor/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExportPackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | undefined;
  projectName: string;
};

export const ExportPackDialog = ({
  open,
  onOpenChange,
  editor,
  projectName,
}: ExportPackDialogProps) => {
  const { isPro, isLoading: proLoading } = usePro();
  const [selected, setSelected] =
    useState<Web3PresetKey[]>(DEFAULT_PACK_PRESET_KEYS);
  const [exporting, setExporting] = useState(false);

  const selectedPresets = useMemo(
    () => WEB3_PRESETS.filter((p) => selected.includes(p.key)),
    [selected],
  );

  const togglePreset = (key: Web3PresetKey) => {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key],
    );
  };

  const doExport = async (mode: "zip" | "files") => {
    if (!editor) {
      toast.error("Editor not ready yet.");
      return;
    }

    if (proLoading) return;
    if (!isPro) {
      toast.error("Pack export is Pro-only. Hold 100,000 PIGCASSO to unlock.");
      return;
    }

    if (selectedPresets.length === 0) {
      toast.error("Select at least one preset.");
      return;
    }

    setExporting(true);
    try {
      const items = await exportPack({
        editor,
        projectName,
        presets: selectedPresets,
      });

      if (mode === "files") {
        for (const item of items) {
          downloadBlob(item.blob, item.fileName);
          // Small delay helps avoid browser download throttling.
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 150));
        }

        toast.success("Downloaded pack files.");
        onOpenChange(false);
        return;
      }

      const zip = new JSZip();
      for (const item of items) {
        zip.file(item.fileName, item.blob);
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      downloadBlob(zipBlob, `${sanitizeFileSegment(projectName)}_pack.zip`);
      toast.success("Downloaded pack ZIP.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export pack.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Pack</DialogTitle>
          <DialogDescription>
            Pro-only multi-size export with safe-area fitting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {WEB3_PRESETS.map((preset) => {
            const active = selected.includes(preset.key);
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => togglePreset(preset.key)}
                disabled={exporting}
                className={[
                  "w-full text-left rounded-lg border p-3 transition",
                  active ? "bg-muted" : "bg-background",
                  exporting ? "opacity-75 cursor-not-allowed" : "hover:bg-muted",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {preset.width}×{preset.height} · Safe margin{" "}
                      {preset.safeMargin}px
                    </div>
                  </div>
                  <div
                    className={[
                      "text-xs px-2 py-1 rounded-full border",
                      active ? "bg-background" : "bg-transparent",
                    ].join(" ")}
                  >
                    {active ? "Included" : "Skip"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => doExport("files")}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Download files
          </Button>
          <Button onClick={() => doExport("zip")} disabled={exporting}>
            {exporting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Download ZIP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
