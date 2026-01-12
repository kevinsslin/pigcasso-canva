"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { createShapeId } from "@tldraw/tlschema";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import { toNanoBananaApiProfile, type NanoBananaProfileOption } from "@/features/ai/lib/nano-banana-profile";
import type { ExtractTextBlock } from "@/features/ai/api/use-extract-text";
import type { AiJobQueue } from "@/features/canvases/lib/ai-job-queue";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import {
  clampCanvasTextScale,
  pickCanvasTextSizeAndScaleFromPx,
  toRichTextValue,
} from "@/features/canvases/lib/text-style";
import { ensureTransparentPngDataUrl } from "@/features/canvases/lib/transparent-png";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { getApiErrorStatus } from "@/lib/api-error";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";

type WithAiCommit = <T>(fn: () => Promise<T> | T) => Promise<T>;

type UseCanvasSelectedImageActionsParams = {
  editor: TldrawEditor | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  aiProfile: NanoBananaProfileOption;
  aiJobQueueRef: { current: AiJobQueue | null };
  startAiUiJob: (label: string) => string;
  updateAiUiJobLabel: (jobId: string, label: string) => void;
  finishAiUiJob: (jobId: string) => void;
  withAiCommit: WithAiCommit;
  selectedImageShape: any | null;
  selectedImageAsset: any | null;
  selectedImageAiSrc: string | null;
  editImage: ReturnType<typeof import("@/features/ai/api/use-edit-image").useEditImage>;
  removeBg: ReturnType<typeof import("@/features/ai/api/use-remove-bg").useRemoveBg>;
  extractText: ReturnType<typeof import("@/features/ai/api/use-extract-text").useExtractText>;
  outputCounterRef: { current: number };
  setMessages: Dispatch<SetStateAction<CanvasChatMessage[]>>;
};

export const useCanvasSelectedImageActions = ({
  editor,
  boardHydrated,
  boardCrashMessage,
  aiProfile,
  aiJobQueueRef,
  startAiUiJob,
  updateAiUiJobLabel,
  finishAiUiJob,
  withAiCommit,
  selectedImageShape,
  selectedImageAsset,
  selectedImageAiSrc,
  editImage,
  removeBg,
  extractText,
  outputCounterRef,
  setMessages,
}: UseCanvasSelectedImageActionsParams) => {
  const ensureCanvasReadyForAiAction = useCallback(() => {
    if (!editor || !boardHydrated || boardCrashMessage) {
      if (boardCrashMessage) {
        toast.error("Board is unavailable. Reload to continue.", { duration: 3000 });
        return false;
      }
      toast.message("Canvas is still loading. Try again in a moment.", { duration: 2500 });
      return false;
    }
    return true;
  }, [boardCrashMessage, boardHydrated, editor]);

  const runAiAction = useCallback(
    async (
      toastIdPrefix: string,
      label: string,
      fn: (context: { setLabel: (nextLabel: string) => void }) => Promise<void>,
    ) => {
      if (!ensureCanvasReadyForAiAction()) return;

      const toastId = `${toastIdPrefix}:${crypto.randomUUID()}`;
      toast.loading(label, { id: toastId, duration: Infinity });
      const uiJobId = startAiUiJob(label);

      try {
        const queue = aiJobQueueRef.current;
        if (!queue) {
          throw new Error("AI queue unavailable. Reload to continue.");
        }

        const setLabel = (nextLabel: string) => {
          toast.loading(nextLabel, { id: toastId, duration: Infinity });
          updateAiUiJobLabel(uiJobId, nextLabel);
        };

        await queue.enqueue(async () => fn({ setLabel }));
        toast.success("Done.", { id: toastId, duration: 2000 });
      } catch (error) {
        const status = getApiErrorStatus(error);
        const message = error instanceof Error ? error.message : "Something went wrong.";
        if (status === 429 && message.toLowerCase().includes("daily limit")) {
          toast.error("Daily AI limit reached. Try again tomorrow or unlock Pro.", { id: toastId, duration: 4000 });
        } else {
          toast.error(message || "Something went wrong.", { id: toastId, duration: 3500 });
        }
      } finally {
        finishAiUiJob(uiJobId);
      }
    },
    [aiJobQueueRef, ensureCanvasReadyForAiAction, finishAiUiJob, startAiUiJob, updateAiUiJobLabel],
  );

  const regenerateSelectedImage = useCallback(async () => {
    const toastId = "pigcasso:canvas:regenerate";
    const targetShape = selectedImageShape;
    const targetAsset = selectedImageAsset;
    const imageSrc = selectedImageAiSrc;
    if (!editor || !targetShape || !targetAsset || !imageSrc) {
      toast.error("Select an image to regenerate.");
      return;
    }

    await runAiAction(toastId, "Generating a variation…", async () => {
      const apiProfile = toNanoBananaApiProfile(aiProfile);
      const instruction = "Create a refined variation of this image. Keep layout and composition consistent.";
      const result = await editImage.mutateAsync({
        image: imageSrc,
        instruction,
        profile: apiProfile,
      });

      const uploadedUrl = await uploadImageDataUrl(result.data, `pigcasso_variation_${Date.now()}.png`);
      const canvasUrl = toCanvasImageUrl(uploadedUrl);

      const point = (() => {
        try {
          const bounds = editor.getShapePageBounds?.(targetShape.id as any) as any;
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

      const inserted = await withAiCommit(() =>
        withHistorySquash(editor as any, "ai:variation", async () => {
          const created = await insertImageToCanvas(editor as any, {
            src: canvasUrl,
            point,
            name: `pigcasso_variation_${Date.now()}.png`,
            size: {
              w: Number(targetAsset?.props?.w) || 1024,
              h: Number(targetAsset?.props?.h) || 1024,
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
        label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
        shapeId: inserted.shapeId,
        url: canvasUrl,
      };
      outputCounterRef.current += 1;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: "Regenerate a variation of the selected image." },
        { id: crypto.randomUUID(), role: "assistant", content: "Added a new variation.", attachments: [attachment] },
      ]);
    });
  }, [
    aiProfile,
    editImage,
    editor,
    outputCounterRef,
    runAiAction,
    selectedImageAiSrc,
    selectedImageAsset,
    selectedImageShape,
    setMessages,
    withAiCommit,
  ]);

  const removeBackgroundFromSelectedImage = useCallback(async () => {
    const toastId = "pigcasso:canvas:remove-bg";
    const targetShape = selectedImageShape;
    const targetAsset = selectedImageAsset;
    const imageSrc = selectedImageAiSrc;
    if (!editor || !targetShape || !targetAsset || !imageSrc) {
      toast.error("Select an image to remove its background.");
      return;
    }

    await runAiAction(toastId, "Removing background…", async ({ setLabel }) => {
      setLabel("Cutting out the subject…");
      const result = await removeBg.mutateAsync({ image: imageSrc });

      setLabel("Ensuring true transparency…");
      const normalized = await ensureTransparentPngDataUrl(result.data);

      setLabel("Uploading image…");
      const uploadedUrl = await uploadImageDataUrl(normalized.dataUrl, `pigcasso_remove_bg_${Date.now()}.png`);
      const canvasUrl = toCanvasImageUrl(uploadedUrl);

      const point = (() => {
        try {
          const bounds = editor.getShapePageBounds?.(targetShape.id as any) as any;
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

      const inserted = await withAiCommit(() =>
        withHistorySquash(editor as any, "ai:remove-bg", async () => {
          const created = await insertImageToCanvas(editor as any, {
            src: canvasUrl,
            point,
            name: `pigcasso_remove_bg_${Date.now()}.png`,
            size: {
              w: Number(targetAsset?.props?.w) || 1024,
              h: Number(targetAsset?.props?.h) || 1024,
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
        label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
        shapeId: inserted.shapeId,
        url: canvasUrl,
      };
      outputCounterRef.current += 1;

      setMessages((prev) => [
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
  }, [
    editor,
    outputCounterRef,
    removeBg,
    runAiAction,
    selectedImageAiSrc,
    selectedImageAsset,
    selectedImageShape,
    setMessages,
    withAiCommit,
  ]);

  const makeSelectedImageTextEditable = useCallback(async () => {
    const toastId = "pigcasso:canvas:separate-layers";
    const targetShape = selectedImageShape;
    const targetAsset = selectedImageAsset;
    const imageSrc = selectedImageAiSrc;

    if (!editor || !targetShape || !targetAsset || !imageSrc) {
      toast.error("Select an image to separate its layers.");
      return;
    }

    await runAiAction(toastId, "Separating layers…", async ({ setLabel }) => {
      const bounds = (() => {
        try {
          return editor.getShapePageBounds?.(targetShape.id as any) as any;
        } catch {
          return null;
        }
      })();
      if (!bounds || typeof bounds !== "object") {
        throw new Error("Could not read image bounds.");
      }

      const point = {
        x: bounds.x + bounds.w + Math.max(96, bounds.w * 0.25),
        y: bounds.y + bounds.h * 0.5,
      };

      const apiProfile = toNanoBananaApiProfile(aiProfile);

      setLabel("Analyzing text & layout…");
      const blocks = await (async () => {
        try {
          const extraction = await extractText.mutateAsync({ image: imageSrc });
          return (extraction.data?.blocks ?? []).filter((b) => b.text?.trim());
        } catch {
          const extraction = await extractText.mutateAsync({ image: imageSrc });
          return (extraction.data?.blocks ?? []).filter((b) => b.text?.trim());
        }
      })();

      const hasText = blocks.length > 0;
      const planLines = [
        "Plan (Separate layers):",
        "- Identify text blocks (OCR + style)",
        hasText ? "- Remove text from the base image" : "- Skip text removal (no text detected)",
        "- Cut out the main subject (transparent PNG)",
        "- Generate a clean background (no subject, no text)",
        "- Recreate editable text layers + group everything",
      ];

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: "Separate the selected image into editable layers." },
        { id: crypto.randomUUID(), role: "assistant", content: planLines.join("\n") },
      ]);

      let baseImage = imageSrc;
      if (hasText) {
        setLabel("Removing text from the image…");
        const noText = await editImage.mutateAsync({
          image: imageSrc,
          instruction:
            "Remove all text, lettering, logos, and watermarks from the image. Keep the subject, background, colors, and lighting unchanged. Return an OPAQUE image (no transparency).",
          profile: apiProfile,
        });
        baseImage = noText.data;
      }

      setLabel("Cutting out the subject…");
      const cutout = await removeBg.mutateAsync({ image: baseImage });
      setLabel("Ensuring true transparency…");
      const normalizedCutout = await ensureTransparentPngDataUrl(cutout.data);
      const cutoutUploadedUrl = await uploadImageDataUrl(normalizedCutout.dataUrl, `pigcasso_subject_${Date.now()}.png`);
      const cutoutCanvasUrl = toCanvasImageUrl(cutoutUploadedUrl);

      setLabel("Generating a clean background…");
      const background = await editImage.mutateAsync({
        image: baseImage,
        instruction:
          "Remove the main foreground subject(s) from the image and reconstruct a clean background that matches the original style and lighting. Do NOT include any text or logos. Return an OPAQUE image (no transparency).",
        profile: apiProfile,
        referenceImages: [normalizedCutout.dataUrl],
      });
      const backgroundUploadedUrl = await uploadImageDataUrl(background.data, `pigcasso_background_${Date.now()}.png`);
      const backgroundCanvasUrl = toCanvasImageUrl(backgroundUploadedUrl);

      const created = await withAiCommit(() =>
        withHistorySquash(editor as any, "ai:separate-layers", async () => {
          setLabel("Placing layers on the canvas…");
          const backgroundInserted = await insertImageToCanvas(editor as any, {
            src: backgroundCanvasUrl,
            point,
            name: `pigcasso_background_${Date.now()}.png`,
            size: {
              w: Number(targetAsset?.props?.w) || 1024,
              h: Number(targetAsset?.props?.h) || 1024,
            },
          });

          const cutoutInserted = await insertImageToCanvas(editor as any, {
            src: cutoutCanvasUrl,
            point,
            name: `pigcasso_subject_${Date.now()}.png`,
            size: {
              w: Number(targetAsset?.props?.w) || 1024,
              h: Number(targetAsset?.props?.h) || 1024,
            },
          });

          try {
            const bgAsset = editor.getAsset?.(backgroundInserted.assetId as any) as any;
            if (bgAsset) {
              editor.updateAssets?.([
                {
                  ...bgAsset,
                  meta: { ...(bgAsset.meta ?? {}), originalSrc: backgroundUploadedUrl },
                },
              ]);
            }
          } catch {
            // ignore
          }

          try {
            const subjectAsset = editor.getAsset?.(cutoutInserted.assetId as any) as any;
            if (subjectAsset) {
              editor.updateAssets?.([
                {
                  ...subjectAsset,
                  meta: { ...(subjectAsset.meta ?? {}), originalSrc: cutoutUploadedUrl },
                },
              ]);
            }
          } catch {
            // ignore
          }

          const insertedBounds = (() => {
            try {
              return editor.getShapePageBounds?.(backgroundInserted.shapeId as any) as any;
            } catch {
              return null;
            }
          })();

          const textBounds =
            insertedBounds && typeof insertedBounds === "object"
              ? insertedBounds
              : { x: point.x - bounds.w / 2, y: point.y - bounds.h / 2, w: bounds.w, h: bounds.h };

          const createdTextShapeIds: string[] = [];
          const textTargets: Array<{ id: string; target: { x: number; y: number; w: number; h: number } }> = [];

          const fitShapeBoundsToTarget = (
            shapeId: string,
            target: { x: number; y: number; w: number; h: number },
          ) => {
            const getShape = () => {
              try {
                return editor.getShape?.(shapeId as any) as any;
              } catch {
                return null;
              }
            };

            const getBounds = () => {
              try {
                return editor.getShapePageBounds?.(shapeId as any) as any;
              } catch {
                return null;
              }
            };

            const firstBounds = getBounds();
            if (!firstBounds || typeof firstBounds !== "object" || !firstBounds.w || !firstBounds.h) return;

            const currentShape = getShape();
            const currentScaleRaw = currentShape?.props?.scale;
            const currentScale =
              typeof currentScaleRaw === "number" &&
              Number.isFinite(currentScaleRaw) &&
              currentScaleRaw > 0
                ? currentScaleRaw
                : 1;

            const scaleX = target.w / firstBounds.w;
            const scaleY = target.h / firstBounds.h;
            const scaleFactor = Math.min(scaleX, scaleY);

            if (Number.isFinite(scaleFactor) && scaleFactor > 0) {
              const nextScale = clampCanvasTextScale(currentScale * scaleFactor);
              editor.updateShape?.({
                id: shapeId as any,
                type: "text",
                props: { scale: nextScale },
              } as any);
            }

            const nextBounds = getBounds();
            if (!nextBounds || typeof nextBounds !== "object") return;
            const nextShape = getShape();
            if (!nextShape || typeof nextShape !== "object") return;

            const dx = target.x - nextBounds.x;
            const dy = target.y - nextBounds.y;
            if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;

            editor.updateShape?.({
              id: shapeId as any,
              type: "text",
              x: Number(nextShape.x ?? 0) + dx,
              y: Number(nextShape.y ?? 0) + dy,
            } as any);
          };

          blocks.slice(0, 40).forEach((block: ExtractTextBlock) => {
            const box = block.box;
            if (!box) return;

            const w = Math.max(40, Math.round(box.w * textBounds.w));
            const h = Math.max(12, Math.round(box.h * textBounds.h));
            const x = textBounds.x + box.x * textBounds.w;
            const y = textBounds.y + box.y * textBounds.h;

            const id = createShapeId();
            createdTextShapeIds.push(id);

            const { size, scale } = pickCanvasTextSizeAndScaleFromPx(h);
            const font = block.font ?? "sans";
            const color = block.color ?? "black";
            const textAlign = block.align ?? "start";
            const angleDegrees = typeof block.angle === "number" ? block.angle : 0;
            const rotation = (angleDegrees * Math.PI) / 180;

            editor.createShape?.({
              id,
              type: "text",
              x,
              y,
              rotation,
              props: {
                color,
                size,
                font,
                textAlign,
                w,
                richText: toRichTextValue(block.text),
                scale,
                autoSize: false,
              },
            } as any);

            const target = { x, y, w, h };
            textTargets.push({ id, target });
            fitShapeBoundsToTarget(id, target);
          });

          try {
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            textTargets.forEach(({ id, target }) => fitShapeBoundsToTarget(id, target));
          } catch {
            // ignore
          }

          try {
            editor.sendToBack?.([backgroundInserted.shapeId] as any);
            if (createdTextShapeIds.length) {
              editor.bringToFront?.(createdTextShapeIds as any);
            }
          } catch {
            // ignore
          }

          try {
            const ids = [backgroundInserted.shapeId, cutoutInserted.shapeId, ...createdTextShapeIds].filter(Boolean);
            if (ids.length > 1) {
              editor.groupShapes?.(ids as any);
            }
          } catch {
            // ignore
          }

          try {
            editor.sendToBack?.([backgroundInserted.shapeId] as any);
            if (createdTextShapeIds.length) {
              editor.bringToFront?.(createdTextShapeIds as any);
            }
          } catch {
            // ignore
          }

          return { insertedShapeId: backgroundInserted.shapeId, url: backgroundCanvasUrl };
        }),
      );

      const attachment: CanvasChatAttachment = {
        id: crypto.randomUUID(),
        type: "image",
        label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
        shapeId: created.insertedShapeId,
        url: created.url,
      };
      outputCounterRef.current += 1;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: blocks.length
            ? "Added background, subject, and editable text layers next to the original."
            : "Added background and subject layers next to the original.",
          attachments: [attachment],
        },
      ]);
    });
  }, [
    aiProfile,
    editImage,
    editor,
    extractText,
    outputCounterRef,
    removeBg,
    runAiAction,
    selectedImageAiSrc,
    selectedImageAsset,
    selectedImageShape,
    setMessages,
    withAiCommit,
  ]);

  return {
    regenerateSelectedImage,
    removeBackgroundFromSelectedImage,
    makeSelectedImageTextEditable,
  };
};
