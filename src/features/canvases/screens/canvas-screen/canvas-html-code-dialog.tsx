"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { createHtmlCardSrcDoc } from "@/features/canvases/tldraw/html-card";
import { copyTextToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const CanvasHtmlCodeDialog = ({
  open,
  onOpenChange,
  html,
  filename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  html: string;
  filename: string;
}) => {
  const [busy, setBusy] = useState(false);

  const srcDoc = useMemo(() => createHtmlCardSrcDoc(html), [html]);

  const downloadBlob = useCallback((blob: Blob, file: string) => {
    if (typeof window === "undefined") return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  const handleCopy = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await copyTextToClipboard(srcDoc);
      toast.message(ok ? "Copied HTML." : "Couldn’t copy.", { duration: 2000 });
    } finally {
      setBusy(false);
    }
  }, [busy, srcDoc]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([srcDoc], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `${filename || "pigcasso"}.html`);
  }, [downloadBlob, filename, srcDoc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="border-b border-border/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">HTML code</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Copy or download a self-contained HTML file.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={handleCopy}
                disabled={!srcDoc.trim() || busy}
              >
                <Copy className="mr-2 size-4" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={handleDownload}
                disabled={!srcDoc.trim()}
              >
                <Download className="mr-2 size-4" />
                Download
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5">
          <ScrollArea className="h-[520px] pr-4">
            <pre className="rounded-xl border bg-background/60 p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap">
              {srcDoc}
            </pre>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

