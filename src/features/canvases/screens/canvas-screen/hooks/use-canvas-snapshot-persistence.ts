"use client";

import { useEffect, useMemo, useRef } from "react";
import debounce from "lodash.debounce";
import type { Editor as TldrawEditor } from "tldraw";

import { DEFAULT_CANVAS_COVER_TARGET_PX, getCanvasCoverScale } from "@/features/canvases/lib/canvas-cover";
import { sanitizeTldrawStoreSnapshot } from "@/features/canvases/tldraw/sanitize-snapshot";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

type UpdateCanvasMutation = {
  mutate: (args: { param: { id: string }; json: { snapshot?: string | null; coverImageUrl?: string | null } }) => void;
  mutateAsync: (args: {
    param: { id: string };
    json: { snapshot?: string | null; coverImageUrl?: string | null };
  }) => Promise<unknown>;
};

type CanvasQueryLike = {
  data?: { coverImageUrl?: string | null } | null;
};

type UseCanvasSnapshotPersistenceParams = {
  canvasId: string;
  editor: TldrawEditor | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  canvasQuery: CanvasQueryLike;
  localSnapshotKey: string;
  updateCanvas: UpdateCanvasMutation;
  hydratingRef: { current: boolean };
  lastSavedSnapshotRef: { current: string | null };
  lastSavedCoverSnapshotRef: { current: string | null };
  pendingCoverSnapshotRef: { current: string | null };
  coverGenerationInFlightRef: { current: boolean };
  coverGenerationRerunRequestedRef: { current: boolean };
};

export const useCanvasSnapshotPersistence = ({
  canvasId,
  editor,
  boardHydrated,
  boardCrashMessage,
  canvasQuery,
  localSnapshotKey,
  updateCanvas,
  hydratingRef,
  lastSavedSnapshotRef,
  lastSavedCoverSnapshotRef,
  pendingCoverSnapshotRef,
  coverGenerationInFlightRef,
  coverGenerationRerunRequestedRef,
}: UseCanvasSnapshotPersistenceParams) => {
  const coverUpdateRef = useRef<ReturnType<typeof debounce> | null>(null);

  const updateBoardCover = useMemo(
    () =>
      debounce(async (snapshotJson: string) => {
        pendingCoverSnapshotRef.current = snapshotJson;

        if (!editor) return;
        if (!boardHydrated) return;
        if (boardCrashMessage) return;
        if (!canvasQuery.data) return;

        const requestedSnapshot = pendingCoverSnapshotRef.current ?? snapshotJson;
        if (requestedSnapshot === lastSavedCoverSnapshotRef.current) return;

        if (coverGenerationInFlightRef.current) {
          coverGenerationRerunRequestedRef.current = true;
          return;
        }

        coverGenerationInFlightRef.current = true;
        coverGenerationRerunRequestedRef.current = false;

        try {
          const shapeIds = (editor.getCurrentPageShapes?.() ?? [])
            .map((shape) => shape.id)
            .filter(Boolean) as any[];

          if (!shapeIds.length) {
            if (canvasQuery.data?.coverImageUrl) {
              await updateCanvas.mutateAsync({
                param: { id: canvasId },
                json: { coverImageUrl: null },
              });
            }
            lastSavedCoverSnapshotRef.current = requestedSnapshot;
            return;
          }

          const bounds = (editor.getCurrentPageBounds?.() ?? null) as any;
          if (!bounds || !Number.isFinite(bounds.w) || !Number.isFinite(bounds.h) || bounds.w <= 0 || bounds.h <= 0) {
            return;
          }

          const scale = getCanvasCoverScale(
            { w: Number(bounds.w), h: Number(bounds.h) },
            { targetPx: DEFAULT_CANVAS_COVER_TARGET_PX },
          );

          const dataUrl = await (editor as any).toImageDataUrl(shapeIds, {
            format: "jpeg",
            quality: 0.82,
            scale,
            background: true,
            padding: 24,
            pixelRatio: 1,
            darkMode: false,
          });

          if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return;

          const uploadedUrl = await uploadImageDataUrl(
            dataUrl,
            `pigcasso_board_cover_${canvasId}_${Date.now()}.jpg`,
          );

          await updateCanvas.mutateAsync({
            param: { id: canvasId },
            json: { coverImageUrl: uploadedUrl },
          });

          lastSavedCoverSnapshotRef.current = requestedSnapshot;
        } catch {
          // ignore
        } finally {
          coverGenerationInFlightRef.current = false;
          const pending = pendingCoverSnapshotRef.current;
          const shouldRerun =
            coverGenerationRerunRequestedRef.current &&
            pending &&
            pending !== lastSavedCoverSnapshotRef.current;
          coverGenerationRerunRequestedRef.current = false;
          if (shouldRerun) {
            coverUpdateRef.current?.(pending);
          }
        }
      }, 4500),
    [
      boardCrashMessage,
      boardHydrated,
      canvasId,
      canvasQuery.data,
      coverGenerationInFlightRef,
      coverGenerationRerunRequestedRef,
      editor,
      lastSavedCoverSnapshotRef,
      pendingCoverSnapshotRef,
      updateCanvas,
    ],
  );

  coverUpdateRef.current = updateBoardCover;

  useEffect(() => {
    return () => {
      updateBoardCover.cancel();
    };
  }, [updateBoardCover]);

  useEffect(() => {
    if (!editor) return;

    let idleHandle: number | null = null;
    let idleMode: "idle" | "timeout" | null = null;

    const cancelIdle = () => {
      if (typeof window === "undefined") return;
      if (idleHandle === null || idleMode === null) return;
      try {
        if (idleMode === "idle" && typeof (window as any).cancelIdleCallback === "function") {
          (window as any).cancelIdleCallback(idleHandle);
        } else if (idleMode === "timeout") {
          window.clearTimeout(idleHandle);
        }
      } catch {
        // ignore
      } finally {
        idleHandle = null;
        idleMode = null;
      }
    };

    const save = debounce(() => {
      if (!boardHydrated) return;
      if (hydratingRef.current) return;
      if (boardCrashMessage) return;

      cancelIdle();

      const run = () => {
        let snapshotJson: string;
        try {
          snapshotJson = JSON.stringify(sanitizeTldrawStoreSnapshot(editor.store.getStoreSnapshot()));
        } catch {
          return;
        }

        if (snapshotJson === lastSavedSnapshotRef.current) return;
        lastSavedSnapshotRef.current = snapshotJson;
        pendingCoverSnapshotRef.current = snapshotJson;

        try {
          localStorage.setItem(localSnapshotKey, snapshotJson);
        } catch {
          // ignore
        }

        if (canvasQuery.data) {
          updateCanvas.mutate({
            param: { id: canvasId },
            json: { snapshot: snapshotJson },
          });
        }

        updateBoardCover(snapshotJson);
      };

      if (typeof window === "undefined") {
        run();
        return;
      }

      const requestIdle = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout?: number }) => number)
        | undefined;

      if (typeof requestIdle === "function") {
        idleMode = "idle";
        idleHandle = requestIdle(
          () => {
            idleHandle = null;
            idleMode = null;
            run();
          },
          { timeout: 2000 },
        );
        return;
      }

      idleMode = "timeout";
      idleHandle = window.setTimeout(() => {
        idleHandle = null;
        idleMode = null;
        run();
      }, 0);
    }, 1100);

    const unsubscribe = editor.store.listen(() => {
      save();
    });

    return () => {
      unsubscribe();
      save.cancel();
      cancelIdle();
    };
  }, [
    boardCrashMessage,
    boardHydrated,
    canvasId,
    canvasQuery.data,
    editor,
    hydratingRef,
    lastSavedSnapshotRef,
    localSnapshotKey,
    pendingCoverSnapshotRef,
    updateBoardCover,
    updateCanvas,
  ]);

  const hasScheduledInitialCoverRef = useRef(false);
  useEffect(() => {
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;
    if (!canvasQuery.data) return;
    if (hasScheduledInitialCoverRef.current) return;

    hasScheduledInitialCoverRef.current = true;

    const snapshotJson = lastSavedSnapshotRef.current;
    if (snapshotJson) {
      pendingCoverSnapshotRef.current = snapshotJson;
      updateBoardCover(snapshotJson);
    }
  }, [boardCrashMessage, boardHydrated, canvasQuery.data, editor, lastSavedSnapshotRef, pendingCoverSnapshotRef, updateBoardCover]);
};

