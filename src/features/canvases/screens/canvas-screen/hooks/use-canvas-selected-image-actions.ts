"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import type { NanoBananaProfileOption } from "@/features/ai/lib/nano-banana-profile";
import type { AiJobQueue } from "@/features/canvases/lib/ai-job-queue";
import { getApiErrorStatus } from "@/lib/api-error";
import { runRegenerateSelectedImage } from "@/features/canvases/screens/canvas-screen/hooks/selected-image-actions/run-regenerate-selected-image";
import { runRemoveBackgroundFromSelectedImage } from "@/features/canvases/screens/canvas-screen/hooks/selected-image-actions/run-remove-background-selected-image";
import { runSeparateLayersFromSelectedImage } from "@/features/canvases/screens/canvas-screen/hooks/selected-image-actions/run-separate-layers-selected-image";

import type { CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";

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
    await runRegenerateSelectedImage({
      toastIdPrefix: "pigcasso:canvas:regenerate",
      editor,
      aiProfile,
      selectedImageShape,
      selectedImageAsset,
      selectedImageAiSrc,
      editImage,
      outputCounterRef,
      setMessages: (updater) => setMessages(updater),
      withAiCommit,
      runAiAction: async (toastIdPrefix, label, fn) => runAiAction(toastIdPrefix, label, async () => fn()),
    });
  }, [
    aiProfile,
    editImage,
    editor,
    outputCounterRef,
    selectedImageAiSrc,
    selectedImageAsset,
    selectedImageShape,
    setMessages,
    withAiCommit,
    runAiAction,
  ]);

  const removeBackgroundFromSelectedImage = useCallback(async () => {
    await runRemoveBackgroundFromSelectedImage({
      toastIdPrefix: "pigcasso:canvas:remove-bg",
      editor,
      selectedImageShape,
      selectedImageAsset,
      selectedImageAiSrc,
      removeBg,
      outputCounterRef,
      setMessages: (updater) => setMessages(updater),
      withAiCommit,
      runAiAction,
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
    await runSeparateLayersFromSelectedImage({
      editor,
      aiProfile,
      selectedImageShape,
      selectedImageAsset,
      selectedImageAiSrc,
      editImage,
      removeBg,
      extractText,
      outputCounterRef,
      setMessages: (updater) => setMessages(updater),
      withAiCommit,
      runAiAction,
    });
  }, [
    aiProfile,
    editImage,
    editor,
    extractText,
    outputCounterRef,
    removeBg,
    selectedImageAiSrc,
    selectedImageAsset,
    selectedImageShape,
    setMessages,
    withAiCommit,
    runAiAction,
  ]);

  return {
    regenerateSelectedImage,
    removeBackgroundFromSelectedImage,
    makeSelectedImageTextEditable,
  };
};
