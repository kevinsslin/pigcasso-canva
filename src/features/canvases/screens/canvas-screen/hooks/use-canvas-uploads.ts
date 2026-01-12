"use client";

import { useCallback, useEffect } from "react";
import { createShapeId } from "@tldraw/tlschema";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import { toRichTextValue } from "@/features/canvases/lib/text-style";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import { isEditableKeyboardTarget } from "@/features/canvases/tldraw/delete-shortcut";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { createHtmlCardSrcDoc, upsertHtmlCard } from "@/features/canvases/tldraw/html-card";
import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

const MAX_INSERTED_TEXT_CHARS = 20_000;

type InsertTextOptions = {
  font?: string;
  size?: string;
  source?: "paste" | "upload";
};

type UseCanvasUploadsParams = {
  editor: TldrawEditor | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
};

export const useCanvasUploads = ({ editor, boardHydrated, boardCrashMessage }: UseCanvasUploadsParams) => {
  const readFileAsDataUrl = useCallback(async (file: File) => {
    if (typeof FileReader === "undefined") {
      throw new Error("FileReader is not available.");
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          resolve(result);
        } else {
          reject(new Error("File loaded without data."));
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const insertTextToBoard = useCallback(
    async (text: string, options?: InsertTextOptions) => {
      if (!editor || !boardHydrated || boardCrashMessage) return;

      const trimmed = text.trimEnd();
      if (!trimmed.trim()) return;

      const limited =
        trimmed.length > MAX_INSERTED_TEXT_CHARS ? `${trimmed.slice(0, MAX_INSERTED_TEXT_CHARS)}\n…` : trimmed;
      if (trimmed.length > MAX_INSERTED_TEXT_CHARS) {
        toast.message("Pasted text was truncated to keep the canvas responsive.", { duration: 2500 });
      }

      const point = getAiInsertPoint(editor as any);
      const width = 520;
      const x = point.x - width / 2;
      const y = point.y - 18;
      const id = createShapeId();

      const source = options?.source ?? "paste";
      await withHistorySquash(editor as any, `insert:${source}:text`, async () => {
        editor.createShape?.({
          id,
          type: "text",
          x,
          y,
          props: {
            color: "black",
            size: options?.size ?? "m",
            font: options?.font ?? "sans",
            textAlign: "start",
            w: width,
            richText: toRichTextValue(limited),
            scale: 1,
            autoSize: false,
          },
        } as any);
        editor.select?.(id as any);
      });
    },
    [boardCrashMessage, boardHydrated, editor],
  );

  const insertImageFileToBoard = useCallback(
    async (file: File, source: "paste" | "upload") => {
      if (!editor || !boardHydrated || boardCrashMessage) return null;

      const dataUrl = await readFileAsDataUrl(file);
      const uploadedUrl = await uploadImageDataUrl(
        dataUrl,
        file.name?.trim() || `pigcasso_${source}_${Date.now()}.png`,
      );
      const canvasUrl = toCanvasImageUrl(uploadedUrl);

      const point = getAiInsertPoint(editor as any);

      const created = await withHistorySquash(editor as any, `insert:${source}:image`, async () => {
        const created = await insertImageToCanvas(editor as any, {
          src: canvasUrl,
          point,
          name: file.name?.trim() || `IMG_${Date.now()}.png`,
          mimeType: file.type || "image/png",
          fileSize: Math.max(1, Math.floor(file.size || 1)),
        });

        try {
          const createdAsset = editor.getAsset?.(created.assetId as any) as any;
          if (createdAsset) {
            editor.updateAssets?.([
              {
                ...createdAsset,
                meta: { ...(createdAsset.meta ?? {}), originalSrc: uploadedUrl },
              },
            ]);
          }
        } catch {
          // ignore
        }

        return created;
      });

      try {
        editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
      } catch {
        // ignore
      }

      return created;
    },
    [boardCrashMessage, boardHydrated, editor, readFileAsDataUrl],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      if (isEditableKeyboardTarget(event.target)) return;

      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const items = Array.from(clipboard.items ?? []);
      const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/")) ?? null;
      const imageFile =
        imageItem?.getAsFile?.() ?? Array.from(clipboard.files ?? []).find((file) => file.type.startsWith("image/")) ?? null;

      if (imageFile) {
        event.preventDefault();
        void insertImageFileToBoard(imageFile, "paste");
        return;
      }

      const text = clipboard.getData("text/plain") || "";
      if (!text.trim()) return;

      event.preventDefault();
      const looksLikeCode = /<html|<!doctype|function\\s|import\\s|\\{\\s*\\n/.test(text);
      void insertTextToBoard(
        text,
        looksLikeCode ? { font: "mono", size: "s", source: "paste" } : { source: "paste" },
      );
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [boardCrashMessage, boardHydrated, editor, insertImageFileToBoard, insertTextToBoard]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!editor || !boardHydrated || boardCrashMessage) {
        toast.message("Canvas is still loading. Try again in a moment.", { duration: 2200 });
        return;
      }

      for (const file of files) {
        try {
          if (file.type.startsWith("image/")) {
            await insertImageFileToBoard(file, "upload");
            continue;
          }

          const name = file.name?.trim() || "upload";
          const lower = name.toLowerCase();
          const ext = lower.includes(".") ? (lower.split(".").pop() ?? "") : "";

          const isHtml = file.type === "text/html" || ext === "html" || ext === "htm";
          if (isHtml) {
            const html = await file.text();
            const point = getAiInsertPoint(editor as any);
            await withHistorySquash(editor as any, "insert:upload:html", async () => {
              upsertHtmlCard(editor as any, { html, point });
            });
            continue;
          }

          const isTextFile =
            file.type.startsWith("text/") ||
            [
              "txt",
              "md",
              "json",
              "js",
              "jsx",
              "ts",
              "tsx",
              "css",
              "py",
              "sol",
              "yaml",
              "yml",
              "toml",
            ].includes(ext);

          if (isTextFile) {
            const content = await file.text();
            const prefix = name ? `${name}\n\n` : "";
            const looksLikeCode = [
              "json",
              "js",
              "jsx",
              "ts",
              "tsx",
              "css",
              "py",
              "sol",
              "yaml",
              "yml",
              "toml",
              "md",
            ].includes(ext);
            await insertTextToBoard(`${prefix}${content}`, {
              font: looksLikeCode ? "mono" : "sans",
              size: looksLikeCode ? "s" : "m",
              source: "upload",
            });
            continue;
          }

          toast.message(`Skipped ${name}: unsupported file type.`, { duration: 2500 });
        } catch (error) {
          const message = error instanceof Error ? error.message : `Failed to upload ${file.name || "file"}.`;
          toast.error(message, { duration: 3500 });
        }
      }
    },
    [boardCrashMessage, boardHydrated, editor, insertImageFileToBoard, insertTextToBoard],
  );

  const downloadHtml = useCallback((html: string, filename: string) => {
    const srcDoc = createHtmlCardSrcDoc(html);
    const blob = new Blob([srcDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  return {
    handleUploadFiles,
    downloadHtml,
  };
};

