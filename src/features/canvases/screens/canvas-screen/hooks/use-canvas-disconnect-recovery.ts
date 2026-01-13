import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { useBoardDisconnectGuard } from "@/features/canvases/hooks/use-board-disconnect-guard";
import type { CanvasTool } from "@/features/canvases/lib/canvas-tools";

export const useCanvasDisconnectRecovery = (params: {
  enabled: boolean;
  editor: any | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  hasMountedEditor: boolean;
  remounting: boolean;
  remountingRef: { current: boolean };
  disconnectStreakRef: { current: { startedAt: number; count: number } };
  autoRecoverAttemptsRef: { current: number };
  reloadTimeoutRef: { current: number | null };
  loadedSnapshotEditorRef: { current: any | null };
  hydratingRef: { current: boolean };
  hasProxiedImageAssetsRef: { current: boolean };
  hasUserEditedRef: { current: boolean };
  hasShownRemoteSyncSkippedToastRef: { current: boolean };
  tabPointerDownRef: { current: any };
  setTabAnchor: (next: any) => void;
  setActiveTool: (tool: CanvasTool) => void;
  setTldrawMountKey: (updater: (prev: number) => number) => void;
  setBoardCrashMessage: (next: string | null | ((prev: string | null) => string | null)) => void;
  setBoardHydrated: (next: boolean) => void;
  lastKnownToolIdRef: { current: any };
}) => {
  const {
    enabled,
    editor,
    boardHydrated,
    boardCrashMessage,
    hasMountedEditor,
    remounting,
    remountingRef,
    disconnectStreakRef,
    autoRecoverAttemptsRef,
    reloadTimeoutRef,
    loadedSnapshotEditorRef,
    hydratingRef,
    hasProxiedImageAssetsRef,
    hasUserEditedRef,
    hasShownRemoteSyncSkippedToastRef,
    tabPointerDownRef,
    setTabAnchor,
    setActiveTool,
    setTldrawMountKey,
    setBoardCrashMessage,
    setBoardHydrated,
    lastKnownToolIdRef,
  } = params;

  const reloadBoard = useCallback(() => {
    remountingRef.current = true;

    if (typeof window !== "undefined") {
      if (reloadTimeoutRef.current) {
        window.clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = window.setTimeout(() => {
        reloadTimeoutRef.current = null;
        remountingRef.current = false;
        setBoardCrashMessage("Board disconnected. Reload to continue.");
      }, 5000);
    }

    setBoardCrashMessage(null);
    setBoardHydrated(false);
    loadedSnapshotEditorRef.current = null;
    hydratingRef.current = false;
    lastKnownToolIdRef.current = null;
    hasProxiedImageAssetsRef.current = false;
    hasUserEditedRef.current = false;
    hasShownRemoteSyncSkippedToastRef.current = false;
    tabPointerDownRef.current = null;
    setTabAnchor(null);
    setActiveTool("select");
    setTldrawMountKey((prev) => prev + 1);
  }, [
    hasProxiedImageAssetsRef,
    hasShownRemoteSyncSkippedToastRef,
    hasUserEditedRef,
    hydratingRef,
    lastKnownToolIdRef,
    loadedSnapshotEditorRef,
    reloadTimeoutRef,
    remountingRef,
    setActiveTool,
    setBoardCrashMessage,
    setBoardHydrated,
    setTabAnchor,
    setTldrawMountKey,
    tabPointerDownRef,
  ]);

  const handleBoardDisconnect = useCallback(() => {
    const now = Date.now();
    const windowMs = 20_000;

    if (!disconnectStreakRef.current.startedAt || now - disconnectStreakRef.current.startedAt > windowMs) {
      disconnectStreakRef.current = { startedAt: now, count: 0 };
    }

    disconnectStreakRef.current.count += 1;
    autoRecoverAttemptsRef.current = disconnectStreakRef.current.count;

    if (disconnectStreakRef.current.count <= 2) {
      toast.message("Reconnecting board…", { duration: 1800 });
      reloadBoard();
      return;
    }

    setBoardCrashMessage(
      "Board disconnected repeatedly. Reload to continue.\n\nTip: open this board with ?debug=1 and share the debug panel + browser console logs.",
    );
  }, [autoRecoverAttemptsRef, disconnectStreakRef, reloadBoard, setBoardCrashMessage]);

  useBoardDisconnectGuard({
    enabled,
    editor,
    boardHydrated,
    boardCrashMessage,
    hasMountedEditor,
    remounting,
    delayMs: 1200,
    onDisconnect: handleBoardDisconnect,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const handle = window.setTimeout(() => {
      disconnectStreakRef.current = { startedAt: 0, count: 0 };
      autoRecoverAttemptsRef.current = 0;
    }, 5000);

    return () => {
      window.clearTimeout(handle);
    };
  }, [autoRecoverAttemptsRef, boardCrashMessage, boardHydrated, disconnectStreakRef, editor]);

  return { reloadBoard };
};
