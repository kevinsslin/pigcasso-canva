import { toast } from "sonner";

import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";
import { ensureTransparentPngDataUrl } from "@/features/canvases/lib/transparent-png";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

type WithAiCommit = <T>(fn: () => Promise<T> | T) => Promise<T>;

type RunAiAction = (toastIdPrefix: string, label: string, fn: (context: { setLabel: (next: string) => void }) => Promise<void>) => Promise<void>;

export const runRemoveBackgroundFromSelectedImage = async (params: {
  toastIdPrefix: string;
  editor: any | null;
  selectedImageShape: any | null;
  selectedImageAsset: any | null;
  selectedImageAiSrc: string | null;
  removeBg: { mutateAsync: (input: any) => Promise<{ data: string }> };
  outputCounterRef: { current: number };
  setMessages: (updater: (prev: CanvasChatMessage[]) => CanvasChatMessage[]) => void;
  withAiCommit: WithAiCommit;
  runAiAction: RunAiAction;
}) => {
  const { editor, selectedImageShape, selectedImageAsset, selectedImageAiSrc } = params;
  const imageSrc = selectedImageAiSrc;
  if (!editor || !selectedImageShape || !selectedImageAsset || !imageSrc) {
    toast.error("Select an image to remove its background.");
    return;
  }

  await params.runAiAction(params.toastIdPrefix, "Removing background…", async ({ setLabel }) => {
    setLabel("Cutting out the subject…");
    const result = await params.removeBg.mutateAsync({ image: imageSrc });

    setLabel("Ensuring true transparency…");
    const normalized = await ensureTransparentPngDataUrl(result.data);

    setLabel("Uploading image…");
    const uploadedUrl = await uploadImageDataUrl(normalized.dataUrl, `pigcasso_remove_bg_${Date.now()}.png`);
    const canvasUrl = toCanvasImageUrl(uploadedUrl);

    const point = (() => {
      try {
        const bounds = editor.getShapePageBounds?.(selectedImageShape.id as any) as any;
        if (bounds && typeof bounds === "object") {
          return {
            x: bounds.x + bounds.w + Math.max(80, bounds.w * 0.2),
            y: bounds.y + bounds.h * 0.5,
          };
        }
      } catch {
        // ignore
      }
      return getAiInsertPoint(editor as any);
    })();

    const inserted = await params.withAiCommit(() =>
      withHistorySquash(editor as any, "ai:remove-bg", async () => {
        const created = await insertImageToCanvas(editor as any, {
          src: canvasUrl,
          point,
          name: `pigcasso_remove_bg_${Date.now()}.png`,
          size: {
            w: Number(selectedImageAsset?.props?.w) || 1024,
            h: Number(selectedImageAsset?.props?.h) || 1024,
          },
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
      }),
    );

    const attachment: CanvasChatAttachment = {
      id: crypto.randomUUID(),
      type: "image",
      label: `IMG_${String(params.outputCounterRef.current).padStart(4, "0")}`,
      shapeId: inserted.shapeId,
      url: canvasUrl,
    };
    params.outputCounterRef.current += 1;

    params.setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: "Remove background from the selected image." },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: normalized.changed
          ? "Added a cut-out version (transparent PNG)."
          : "Added a cut-out version (transparent PNG). If you see a checkerboard, that’s just the transparency indicator in some viewers.",
        attachments: [attachment],
      },
    ]);
  });
};

