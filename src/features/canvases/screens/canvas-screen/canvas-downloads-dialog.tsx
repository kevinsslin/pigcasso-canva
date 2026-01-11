"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { Code2, Download, Image as ImageIcon, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import { createHtmlCardSrcDoc } from "@/features/canvases/tldraw/html-card";
import type { CanvasChatAttachment } from "@/features/canvases/screens/canvas-screen/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const getExtensionForMime = (mime: string | null) => {
  const type = (mime ?? "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  if (type.includes("html")) return "html";
  return null;
};

export const CanvasDownloadsDialog = ({
  open,
  onOpenChange,
  attachments,
  editor,
  onFocusShape,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachments: CanvasChatAttachment[];
  editor: TldrawEditor | null;
  onFocusShape: (shapeId: string) => void;
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const allAttachments = useMemo(() => attachments, [attachments]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(allAttachments.map((att) => att.id));
  }, [allAttachments, open]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(allAttachments.map((att) => att.id));
  }, [allAttachments]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    if (typeof window === "undefined") return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  const exportAttachment = useCallback(
    async (attachment: CanvasChatAttachment) => {
      if (attachment.type === "html") {
        const html =
          attachment.html ??
          (() => {
            if (!editor) return "";
            const shape = editor.getShape?.(attachment.shapeId as any) as any;
            return typeof shape?.props?.html === "string" ? shape.props.html : "";
          })();

        if (!html) throw new Error("Missing HTML content.");

        const srcDoc = createHtmlCardSrcDoc(html);
        const blob = new Blob([srcDoc], { type: "text/html;charset=utf-8" });
        return { blob, filename: `${attachment.label}.html` };
      }

      const url = attachment.url;
      if (!url) throw new Error("Missing image URL.");

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to download image.");
      const blob = await response.blob();
      const ext = getExtensionForMime(blob.type) ?? "png";
      return { blob, filename: `${attachment.label}.${ext}` };
    },
    [editor],
  );

  const downloadSelected = useCallback(async () => {
    if (!selectedIds.length) return;
    const selected = allAttachments.filter((att) => selectedIds.includes(att.id));
    if (!selected.length) return;
    if (downloadBusy) return;

    setDownloadBusy(true);

    try {
      if (selected.length === 1) {
        const { blob, filename } = await exportAttachment(selected[0]);
        downloadBlob(blob, filename);
        onOpenChange(false);
        return;
      }

      const zip = new JSZip();
      const seenNames = new Map<string, number>();
      const uniqueName = (filename: string) => {
        const count = seenNames.get(filename) ?? 0;
        seenNames.set(filename, count + 1);
        if (count === 0) return filename;
        const dot = filename.lastIndexOf(".");
        if (dot > 0) return `${filename.slice(0, dot)}_${count + 1}${filename.slice(dot)}`;
        return `${filename}_${count + 1}`;
      };

      for (const att of selected) {
        const { blob, filename } = await exportAttachment(att);
        zip.file(uniqueName(filename), blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `pigcasso_outputs_${Date.now()}.zip`);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download outputs.";
      toast.error(message, { duration: 3500 });
    } finally {
      setDownloadBusy(false);
    }
  }, [allAttachments, downloadBlob, downloadBusy, exportAttachment, onOpenChange, selectedIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <div className="border-b border-border/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Download outputs</div>
              <div className="mt-1 text-sm text-muted-foreground">Export images and HTML from this session.</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={selectAll}
                disabled={!allAttachments.length || downloadBusy}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={clearSelection}
                disabled={!selectedIds.length || downloadBusy}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {allAttachments.length ? (
            <ScrollArea className="h-[360px] pr-3">
              <div className="space-y-2">
                {allAttachments.map((att) => {
                  const checked = selectedIds.includes(att.id);

                  return (
                    <div
                      key={att.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-background/60 p-3 transition hover:bg-background",
                        checked ? "border-primary/40" : "border-border/60",
                      )}
                      onClick={() => toggleSelection(att.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        toggleSelection(att.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelection(att.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4"
                        disabled={downloadBusy}
                        aria-label={`Select ${att.label}`}
                      />

                      {att.type === "image" ? (
                        att.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.url} alt="" className="h-9 w-9 rounded-md object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                            <ImageIcon className="size-4 text-muted-foreground" />
                          </div>
                        )
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                          <Code2 className="size-4 text-muted-foreground" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{att.label}</div>
                        <div className="text-xs text-muted-foreground">{att.type === "image" ? "Image" : "HTML"}</div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={(event) => {
                          event.stopPropagation();
                          onFocusShape(att.shapeId);
                          onOpenChange(false);
                        }}
                        disabled={!editor}
                        aria-label="Locate on canvas"
                      >
                        <LocateFixed className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-sm text-muted-foreground">No outputs yet.</div>
          )}
        </div>

        <div className="border-t border-border/60 p-5 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {selectedIds.length} selected • {allAttachments.length} total
          </div>
          <Button
            type="button"
            className="rounded-full"
            onClick={() => void downloadSelected()}
            disabled={!selectedIds.length || downloadBusy}
          >
            {downloadBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

