"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { createShapeId } from "@tldraw/tlschema";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import { toNanoBananaApiProfile, type NanoBananaProfileOption } from "@/features/ai/lib/nano-banana-profile";
import type { ExtractTextBlock } from "@/features/ai/api/use-extract-text";
import type { AiJobQueue } from "@/features/canvases/lib/ai-job-queue";
import { filterProminentTextBlocks } from "@/features/canvases/lib/extract-text-blocks";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import {
  clampCanvasTextScale,
  pickCanvasTextSizeAndScaleFromPx,
  toRichTextValue,
} from "@/features/canvases/lib/text-style";
import {
  inferTextColorFromRegionPixels,
  loadImagePixels,
  pickFontFamilyPresetForExtractedText,
} from "@/features/canvases/lib/extracted-text-style";
import { ensureTransparentPngDataUrl, getOpaquePixelRatioFromDataUrl } from "@/features/canvases/lib/transparent-png";
import { extractSubjectByBackgroundDiffDataUrl } from "@/features/canvases/lib/subject-matte";
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
          updateAiUiJobLabel(uiJobId, nextLabel);
        };

        await queue.enqueue(async () => fn({ setLabel }));
        toast.dismiss(toastId);
        toast.success("Done.", { duration: 2000 });
      } catch (error) {
        toast.dismiss(toastId);
        const status = getApiErrorStatus(error);
        const message = error instanceof Error ? error.message : "Something went wrong.";
        if (status === 429 && message.toLowerCase().includes("daily limit")) {
          toast.error("Daily AI limit reached. Try again tomorrow or unlock Pro.", { duration: 4000 });
        } else {
          toast.error(message || "Something went wrong.", { duration: 3500 });
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
      const workflowMessageId = crypto.randomUUID();
      const startedAt = Date.now();

      type StepKey = "analyze" | "removeText" | "background" | "subject" | "place";
      type StepStatus = "todo" | "doing" | "done" | "warn";
      type StepState = { key: StepKey; title: string; status: StepStatus; detail?: string | null };

      const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
      let spinnerIndex = 0;
      let spinnerTimer: ReturnType<typeof setInterval> | null = null;
      let currentSteps: StepState[] = [];

      const formatElapsed = (ms: number) => {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return `${minutes}:${seconds}`;
      };

      const getProgressBar = (doneCount: number, total: number) => {
        const size = 10;
        const filled = total > 0 ? Math.round((doneCount / total) * size) : 0;
        return `${"█".repeat(Math.max(0, Math.min(size, filled)))}${"░".repeat(Math.max(0, size - filled))}`;
      };

      const renderWorkflow = (steps: StepState[]) => {
        const completedCount = steps.filter((step) => step.status === "done" || step.status === "warn").length;
        const total = steps.length;
        const progress = getProgressBar(completedCount, total);
        const elapsed = formatElapsed(Date.now() - startedAt);

        const iconFor = (status: StepStatus) => {
          if (status === "done") return "✓";
          if (status === "doing") return SPINNER_FRAMES[spinnerIndex] ?? "⠋";
          if (status === "warn") return "!";
          return "○";
        };

        return [
          "Separate layers",
          `Progress: ${progress}  ${completedCount}/${total}  ·  ${elapsed}`,
          "",
          ...steps.flatMap((step, index) => {
            const icon = iconFor(step.status);
            const active = step.status === "doing";
            const label = `${icon} ${index + 1}. ${step.title}${active ? "…" : ""}`;
            const detail = step.detail?.trim()
              ? `   ${step.detail.trim().replace(/\n/g, "\n   ")}`
              : null;
            return detail ? [label, detail] : [label];
          }),
        ].join("\n");
      };

      const updateWorkflowMessageNow = () => {
        const content = renderWorkflow(currentSteps);
        setMessages((prev) => prev.map((msg) => (msg.id === workflowMessageId ? { ...msg, content } : msg)));
      };

      const ensureSpinner = () => {
        const hasActiveStep = currentSteps.some((step) => step.status === "doing");
        if (!hasActiveStep) {
          if (spinnerTimer) clearInterval(spinnerTimer);
          spinnerTimer = null;
          return;
        }
        if (spinnerTimer) return;
        spinnerTimer = setInterval(() => {
          spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
          updateWorkflowMessageNow();
        }, 180);
      };

      const updateWorkflowMessage = (steps: StepState[]) => {
        currentSteps = steps;
        updateWorkflowMessageNow();
        ensureSpinner();
      };

      const setStep = (
        steps: StepState[],
        key: StepKey,
        patch: Partial<Pick<StepState, "status" | "detail">>,
      ) => {
        const next = steps.map((step) => (step.key === key ? { ...step, ...patch } : step));
        updateWorkflowMessage(next);
        return next;
      };

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

      const initialSteps: StepState[] = [
        { key: "analyze", title: "Analyze text & layout", status: "doing" },
        { key: "removeText", title: "Remove prominent text", status: "todo" },
        { key: "background", title: "Generate background-only", status: "todo" },
        { key: "subject", title: "Extract subject cutout", status: "todo" },
        { key: "place", title: "Place layers on canvas", status: "todo" },
      ];

      try {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "user", content: "Separate the selected image into editable layers." },
          {
            id: workflowMessageId,
            role: "assistant",
            content: renderWorkflow(initialSteps),
          },
        ]);

        updateWorkflowMessage(initialSteps);

      const ensureCanvasImageSource = async (
        input: string,
        filename: string,
      ): Promise<{ canvasUrl: string; originalSrc: string }> => {
        const trimmed = input.trim();
        if (!trimmed) return { canvasUrl: trimmed, originalSrc: trimmed };
        if (trimmed.startsWith("data:")) {
          try {
            const uploaded = await uploadImageDataUrl(trimmed, filename);
            return { canvasUrl: toCanvasImageUrl(uploaded), originalSrc: uploaded };
          } catch {
            return { canvasUrl: trimmed, originalSrc: trimmed };
          }
        }
        return { canvasUrl: toCanvasImageUrl(trimmed), originalSrc: trimmed };
      };

      const imageWidth = Math.max(1, Math.floor(Number(targetAsset?.props?.w) || 1024));
      const imageHeight = Math.max(1, Math.floor(Number(targetAsset?.props?.h) || 1024));

      setLabel("Analyzing text & layout…");
      const sourcePixels = await loadImagePixels(imageSrc).catch(() => null);
      let rawBlocks: ExtractTextBlock[] = [];
      let extractionError: string | null = null;
      try {
        const extraction = await extractText.mutateAsync({ image: imageSrc });
        rawBlocks = (extraction.data?.blocks ?? []).filter((b) => b.text?.trim());
      } catch (error) {
        extractionError = error instanceof Error ? error.message : "Failed to extract text.";
        rawBlocks = [];
      }

      const blocks = filterProminentTextBlocks(rawBlocks, {
        imageWidth,
        imageHeight,
        minHeightPx: 20,
        maxBlocks: 16,
      });

      let steps = initialSteps;
      const ignoredCount = Math.max(0, rawBlocks.length - blocks.length);
      steps = setStep(steps, "analyze", {
        status: extractionError ? "warn" : "done",
        detail: extractionError
          ? `Text detection failed; continuing without editable text. (${extractionError})`
          : `Found ${rawBlocks.length}; keeping ${blocks.length} (${ignoredCount} ignored as too small).`,
      });
      steps = setStep(steps, "removeText", { status: "doing" });

      const hasText = blocks.length > 0;

      let noTextDataUrl = imageSrc;
      if (hasText) {
        try {
          setLabel("Removing prominent text…");
          const noText = await editImage.mutateAsync({
            image: imageSrc,
            instruction:
              "Remove all prominent text (titles, headings, big lettering). Ignore tiny decorative text. Keep the scene intact. Return an OPAQUE image (no transparency).",
            profile: apiProfile,
          });
          noTextDataUrl = noText.data;
          steps = setStep(steps, "removeText", { status: "done", detail: "Removed prominent text." });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to remove text.";
          noTextDataUrl = imageSrc;
          steps = setStep(steps, "removeText", { status: "warn", detail: `Failed; continuing. (${message})` });
        }
      } else {
        steps = setStep(steps, "removeText", { status: "done", detail: "Skipped (no prominent text detected)." });
      }

      const baseForCanvas = await ensureCanvasImageSource(noTextDataUrl, `pigcasso_base_${Date.now()}.png`);

      steps = setStep(steps, "background", { status: "doing" });
      setLabel("Generating background-only…");
      let backgroundDataUrl: string | null = null;
      try {
        const background = await editImage.mutateAsync({
          image: noTextDataUrl,
          instruction:
            "Remove the main foreground subject(s) from the image and reconstruct a clean background that matches the original style and lighting. Remove any remaining prominent text. Return an OPAQUE image (no transparency).",
          profile: apiProfile,
          referenceImages: undefined,
        });
        backgroundDataUrl = typeof background.data === "string" ? background.data : null;
      } catch {
        backgroundDataUrl = null;
      }

      let backgroundSrcForCanvas = baseForCanvas.canvasUrl;
      let backgroundOriginalSrc: string | null = baseForCanvas.originalSrc;
      let backgroundWasFallback = true;

      if (typeof backgroundDataUrl === "string" && backgroundDataUrl.startsWith("data:")) {
        const backgroundForCanvas = await ensureCanvasImageSource(
          backgroundDataUrl,
          `pigcasso_background_${Date.now()}.png`,
        );
        backgroundOriginalSrc = backgroundForCanvas.originalSrc;
        backgroundSrcForCanvas = backgroundForCanvas.canvasUrl;
        backgroundWasFallback = false;
      }

      steps = setStep(steps, "background", {
        status: backgroundWasFallback ? "warn" : "done",
        detail: backgroundWasFallback ? "Failed; using base image as background." : "Background-only ready.",
      });

      steps = setStep(steps, "subject", { status: "doing" });
      setLabel("Extracting subject…");
      const MIN_SUBJECT_OPAQUE_RATIO = 0.001;

      let subjectSrcForCanvas = baseForCanvas.canvasUrl;
      let subjectOriginalSrc: string | null = baseForCanvas.originalSrc;
      let subjectDetail: string = "Using base image as subject (fallback).";

      const subjectFromRemoveBg = await (async () => {
        try {
          const cutout = await removeBg.mutateAsync({ image: noTextDataUrl });
          return cutout.data;
        } catch {
          return null;
        }
      })();

      let subjectCandidate: string | null = null;
      if (typeof subjectFromRemoveBg === "string" && subjectFromRemoveBg.startsWith("data:")) {
        const normalized = await ensureTransparentPngDataUrl(subjectFromRemoveBg);
        const opaqueRatio = await getOpaquePixelRatioFromDataUrl(normalized.dataUrl).catch(() => null);
        if (opaqueRatio !== null && opaqueRatio >= MIN_SUBJECT_OPAQUE_RATIO) {
          subjectCandidate = normalized.dataUrl;
          subjectDetail = "Cutout from remove-bg (transparent PNG).";
        }
      }

      if (!subjectCandidate && typeof backgroundDataUrl === "string" && backgroundDataUrl.startsWith("data:")) {
        const diff = await extractSubjectByBackgroundDiffDataUrl({
          foregroundDataUrl: noTextDataUrl,
          backgroundDataUrl,
        }).catch(() => null);

        if (diff?.changed && typeof diff.dataUrl === "string") {
          const normalized = await ensureTransparentPngDataUrl(diff.dataUrl);
          const opaqueRatio =
            typeof diff.opaqueRatio === "number" && Number.isFinite(diff.opaqueRatio)
              ? diff.opaqueRatio
              : await getOpaquePixelRatioFromDataUrl(normalized.dataUrl).catch(() => null);
          if (opaqueRatio !== null && opaqueRatio >= MIN_SUBJECT_OPAQUE_RATIO) {
            subjectCandidate = normalized.dataUrl;
            subjectDetail = "Cutout from background-diff (transparent PNG).";
          }
        }
      }

      if (subjectCandidate) {
        const subjectForCanvas = await ensureCanvasImageSource(subjectCandidate, `pigcasso_subject_${Date.now()}.png`);
        subjectOriginalSrc = subjectForCanvas.originalSrc;
        subjectSrcForCanvas = subjectForCanvas.canvasUrl;
      }

      steps = setStep(steps, "subject", {
        status: subjectCandidate ? "done" : "warn",
        detail: subjectDetail,
      });

      steps = setStep(steps, "place", { status: "doing" });

      const created = await withAiCommit(() =>
        withHistorySquash(editor as any, "ai:separate-layers", async () => {
          setLabel("Placing layers on the canvas…");
          const backgroundInserted = await insertImageToCanvas(editor as any, {
            src: backgroundSrcForCanvas,
            point,
            name: `pigcasso_background_${Date.now()}.png`,
            size: {
              w: Number(targetAsset?.props?.w) || 1024,
              h: Number(targetAsset?.props?.h) || 1024,
            },
          });

          const cutoutInserted = await insertImageToCanvas(editor as any, {
            src: subjectSrcForCanvas,
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
                  meta: { ...(bgAsset.meta ?? {}), originalSrc: backgroundOriginalSrc },
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
                  meta: { ...(subjectAsset.meta ?? {}), originalSrc: subjectOriginalSrc },
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
            const color = (() => {
              const defaultColor = block.color ?? "black";
              if (!sourcePixels) return defaultColor;
              const pxX = Math.floor(box.x * sourcePixels.width);
              const pxY = Math.floor(box.y * sourcePixels.height);
              const pxW = Math.max(1, Math.floor(box.w * sourcePixels.width));
              const pxH = Math.max(1, Math.floor(box.h * sourcePixels.height));
              const inferred = inferTextColorFromRegionPixels({
                pixels: sourcePixels.pixels,
                width: sourcePixels.width,
                height: sourcePixels.height,
                region: { x: pxX, y: pxY, w: pxW, h: pxH },
              });
              return inferred.confidence >= 0.35 ? inferred.color : defaultColor;
            })();
            const textAlign = block.align ?? "start";
            const angleDegrees = typeof block.angle === "number" ? block.angle : 0;
            const rotation = (angleDegrees * Math.PI) / 180;
            const fontFamilyMeta = pickFontFamilyPresetForExtractedText({ text: block.text, font });

            editor.createShape?.({
              id,
              type: "text",
              x,
              y,
              rotation,
              meta: fontFamilyMeta ? { [fontFamilyMeta.metaKey]: fontFamilyMeta.fontFamily } : undefined,
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

          return { insertedShapeId: backgroundInserted.shapeId, url: backgroundSrcForCanvas };
        }),
      );

      steps = setStep(steps, "place", {
        status: "done",
        detail: `Placed background + subject${blocks.length ? ` + ${blocks.length} text layer(s)` : ""}.`,
      });

      const attachment: CanvasChatAttachment = {
        id: crypto.randomUUID(),
        type: "image",
        label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
        shapeId: created.insertedShapeId,
        url: backgroundSrcForCanvas,
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
      } finally {
        if (spinnerTimer) clearInterval(spinnerTimer);
        spinnerTimer = null;
      }
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
