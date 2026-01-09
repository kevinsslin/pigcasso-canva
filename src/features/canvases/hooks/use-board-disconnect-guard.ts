"use client";

import { useEffect } from "react";

type UseBoardDisconnectGuardOptions = {
  editor: unknown | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  hasMountedEditor: boolean;
  remounting: boolean;
  delayMs?: number;
  onDisconnect: () => void;
};

export const useBoardDisconnectGuard = ({
  editor,
  boardHydrated,
  boardCrashMessage,
  hasMountedEditor,
  remounting,
  delayMs = 500,
  onDisconnect,
}: UseBoardDisconnectGuardOptions) => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;
    if (!hasMountedEditor) return;
    if (remounting) return;

    const handle = window.setTimeout(() => {
      onDisconnect();
    }, delayMs);

    return () => {
      window.clearTimeout(handle);
    };
  }, [boardCrashMessage, boardHydrated, delayMs, editor, hasMountedEditor, onDisconnect, remounting]);
};

