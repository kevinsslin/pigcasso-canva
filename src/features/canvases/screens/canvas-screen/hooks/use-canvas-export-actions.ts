"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { exportCanvasSelectionToPngDataUrl } from "@/features/canvases/tldraw/export-canvas-image";
import { toCanvasImageUrl, unwrapCanvasImageProxyUrl } from "@/features/canvases/lib/image-proxy";
import { getSelectionContext } from "@/features/canvases/lib/selection-context";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

import type { CanvasExportNftTarget } from "@/features/canvases/screens/canvas-screen/canvas-export-nft-dialog";
import type { CanvasPrintrLaunchTarget } from "@/features/canvases/screens/canvas-screen/canvas-printr-launch-dialog";

const getExtensionForMime = (mime: string | null) => {
  const type = (mime ?? "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  return null;
};

export const useCanvasExportActions = (params: {
  editor: any | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  canvasId: string;
  canvasName: string;
  selectedShapeIds: string[];
  selectedImageShape: any | null;
  selectedImageAsset: any | null;
  selectedGroupMintImageShapeId: string | null;
  setExportNftOpen: (next: boolean) => void;
  setExportNftTarget: (next: CanvasExportNftTarget | null) => void;
  setPrintrOpen: (next: boolean) => void;
  setPrintrTarget: (next: CanvasPrintrLaunchTarget | null) => void;
}) => {
  const {
    editor,
    boardHydrated,
    boardCrashMessage,
    canvasId,
    canvasName,
    selectedShapeIds,
    selectedImageShape,
    selectedImageAsset,
    selectedGroupMintImageShapeId,
    setExportNftOpen,
    setExportNftTarget,
    setPrintrOpen,
    setPrintrTarget,
  } = params;

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

  const downloadSelectedImage = useCallback(async () => {
    const asset = selectedImageAsset as any;
    if (!asset) {
      toast.error("Select an image to download.");
      return;
    }

    const url =
      (typeof asset?.props?.src === "string" && asset.props.src.trim()) ||
      (typeof asset?.meta?.rawSrc === "string" && toCanvasImageUrl(asset.meta.rawSrc)) ||
      (typeof asset?.meta?.originalSrc === "string" && toCanvasImageUrl(asset.meta.originalSrc)) ||
      null;

    if (!url) {
      toast.error("Selected image is missing a URL.");
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to download image.");
      }

      const blob = await response.blob();
      const ext = getExtensionForMime(blob.type) ?? "png";

      const rawName = typeof asset?.props?.name === "string" ? asset.props.name.trim() : "";
      const baseName = rawName || `IMG_${Date.now()}`;
      const filename = /\.[a-z0-9]+$/i.test(baseName) ? baseName : `${baseName}.${ext}`;

      downloadBlob(blob, filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download image.";
      toast.error(message, { duration: 3500 });
    }
  }, [downloadBlob, selectedImageAsset]);

  const exportSelectedSelectionAsPng = useCallback(async () => {
    if (!editor) {
      toast.error("Canvas is still loading. Try again in a moment.");
      return;
    }
    if (!boardHydrated || boardCrashMessage) {
      toast.error("Canvas is still loading. Try again in a moment.");
      return;
    }
    if (selectedShapeIds.length !== 1) {
      toast.error("Select a single item to export.");
      return;
    }

    const shapeId = String(selectedShapeIds[0]);
    const toastId = toast.loading("Exporting PNG…");
    try {
      const dataUrl = await exportCanvasSelectionToPngDataUrl(editor as any, {
        shapeId,
        targetPx: 2048,
        padding: 32,
        pixelRatio: 1,
        background: true,
      });

      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error("Failed to export PNG.");
      }
      const blob = await response.blob();
      downloadBlob(blob, `pigcasso_export_${Date.now()}.png`);
      toast.success("PNG downloaded.", { id: toastId, duration: 1500 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export PNG.";
      toast.error(message, { id: toastId, duration: 3500 });
    }
  }, [boardCrashMessage, boardHydrated, downloadBlob, editor, selectedShapeIds]);

  const openExportNftForShapeId = useCallback(
    async (shapeId: string) => {
      if (!editor) {
        toast.error("Canvas is still loading. Try again in a moment.");
        return;
      }

      const shape = (() => {
        try {
          return editor.getShape?.(shapeId as any) as any;
        } catch {
          return null;
        }
      })();

      if (!shape || typeof shape !== "object" || shape.type !== "image" || !shape.props?.assetId) {
        toast.error("Select an image to mint.");
        return;
      }

      const asset = (() => {
        try {
          return editor.getAsset?.(shape.props.assetId as any) as any;
        } catch {
          return null;
        }
      })();

      if (!asset) {
        toast.error("Select an image to mint.");
        return;
      }

      const previewSrc = typeof asset?.props?.src === "string" ? asset.props.src.trim() : "";
      const originalSrc = typeof asset?.meta?.originalSrc === "string" ? asset.meta.originalSrc.trim() : "";
      const rawSrc = typeof asset?.meta?.rawSrc === "string" ? asset.meta.rawSrc.trim() : "";
      const propsSrc = typeof asset?.props?.src === "string" ? asset.props.src.trim() : "";
      const unwrapped = propsSrc ? unwrapCanvasImageProxyUrl(propsSrc) : "";

      const imageUrl = originalSrc || rawSrc || unwrapped || "";

      const rawName = typeof asset?.props?.name === "string" ? asset.props.name.trim() : "";
      const fallbackPreviewUrl = previewSrc || (imageUrl ? toCanvasImageUrl(imageUrl) : "");
      const contextLabel = getSelectionContext(editor as any, shapeId)?.label ?? null;

      const toastId = toast.loading("Preparing PNG…");

      const compositeUrl = await (async () => {
        if (!boardHydrated) return null;
        if (boardCrashMessage) return null;

        try {
          const dataUrl = await exportCanvasSelectionToPngDataUrl(editor as any, {
            shapeId,
            targetPx: 2048,
            padding: 32,
            pixelRatio: 1,
            background: true,
          });

          return await uploadImageDataUrl(dataUrl, `pigcasso_canvas_${canvasId}_${Date.now()}.png`);
        } catch {
          return null;
        }
      })();

      if (!compositeUrl) {
        toast.error("Couldn’t export a combined PNG. Please try again.", { id: toastId, duration: 3500 });
        return;
      }

      toast.success("PNG ready.", { id: toastId, duration: 1200 });

      const exportImageUrl = compositeUrl;
      const previewUrl = compositeUrl || fallbackPreviewUrl || imageUrl;

      setExportNftTarget({
        canvasId,
        canvasName,
        shapeId,
        imageUrl: exportImageUrl,
        previewUrl,
        defaultName: rawName || contextLabel || canvasName,
      });
      setExportNftOpen(true);
    },
    [boardCrashMessage, boardHydrated, canvasId, canvasName, editor, setExportNftOpen, setExportNftTarget],
  );

  const mintSelectionAsNft = useCallback(() => {
    const shapeId = selectedImageShape ? String((selectedImageShape as any).id) : selectedGroupMintImageShapeId;
    if (!shapeId) {
      toast.error("Select an image to mint.");
      return;
    }

    void openExportNftForShapeId(shapeId);
  }, [openExportNftForShapeId, selectedGroupMintImageShapeId, selectedImageShape]);

  const openPrintrLaunchForShapeId = useCallback(
    async (shapeId: string) => {
      if (!editor) {
        toast.error("Canvas is still loading. Try again in a moment.");
        return;
      }
      if (!boardHydrated || boardCrashMessage) {
        toast.error("Canvas is still loading. Try again in a moment.");
        return;
      }

      const shape = (() => {
        try {
          return editor.getShape?.(shapeId as any) as any;
        } catch {
          return null;
        }
      })();

      if (!shape || typeof shape !== "object" || shape.type !== "image") {
        toast.error("Select an image to launch.");
        return;
      }

      const contextLabel = getSelectionContext(editor as any, shapeId)?.label ?? null;
      const toastId = toast.loading("Preparing token image…");

      try {
        const dataUrl = await exportCanvasSelectionToPngDataUrl(editor as any, {
          shapeId,
          targetPx: 1536,
          padding: 32,
          pixelRatio: 1,
          background: true,
        });

        setPrintrTarget({
          canvasId,
          canvasName,
          shapeId,
          imageDataUrl: dataUrl,
          defaultName: contextLabel || canvasName,
        });
        setPrintrOpen(true);
        toast.success("Ready to launch.", { id: toastId, duration: 1200 });
      } catch (error) {
        console.error("[printr] Failed to export token image", error);
        toast.error("Couldn’t prepare the token image. Please try again.", { id: toastId, duration: 3500 });
      }
    },
    [boardCrashMessage, boardHydrated, canvasId, canvasName, editor, setPrintrOpen, setPrintrTarget],
  );

  const launchSelectionOnPrintr = useCallback(() => {
    const shapeId = selectedImageShape ? String((selectedImageShape as any).id) : selectedGroupMintImageShapeId;
    if (!shapeId) {
      toast.error("Select an image to launch.");
      return;
    }

    void openPrintrLaunchForShapeId(shapeId);
  }, [openPrintrLaunchForShapeId, selectedGroupMintImageShapeId, selectedImageShape]);

  return {
    downloadSelectedImage,
    exportSelectedSelectionAsPng,
    mintSelectionAsNft,
    launchSelectionOnPrintr,
  };
};
