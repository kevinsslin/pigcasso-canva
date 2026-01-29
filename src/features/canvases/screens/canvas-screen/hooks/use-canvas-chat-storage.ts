"use client";

import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";

import { parseCanvasChatMessages, serializeCanvasChatMessages } from "@/features/canvases/lib/chat-history";
import type { CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";
import { MAX_CANVAS_CHAT_CHARS } from "@/lib/canvas-limits";

type UseCanvasChatStorageParams = {
  canvasId: string;
  ready: boolean;
  authenticated: boolean;
  boardCrashMessage: string | null;
  messages: CanvasChatMessage[];
  setMessages: Dispatch<SetStateAction<CanvasChatMessage[]>>;
  canvasQuery: {
    data?: { chatJson?: string | null } | null;
    isSuccess: boolean;
    isError: boolean;
  };
  updateCanvas: {
    mutate: (args: { param: { id: string }; json: { chatJson: string | null } }) => void;
  };
};

export const useCanvasChatStorage = ({
  canvasId,
  ready,
  authenticated,
  boardCrashMessage,
  messages,
  setMessages,
  canvasQuery,
  updateCanvas,
}: UseCanvasChatStorageParams) => {
  const localChatKey = useMemo(() => `pigcasso:canvas:${canvasId}:chat`, [canvasId]);

  const hasLoadedChatRef = useRef(false);
  const chatHydratingRef = useRef(false);
  const lastSavedChatRef = useRef<string | null>(null);
  const oversizeChatRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ready || !authenticated) return;
    if (!canvasQuery.isSuccess && !canvasQuery.isError) return;
    if (hasLoadedChatRef.current) return;

    hasLoadedChatRef.current = true;
    chatHydratingRef.current = true;

    const remoteMessages = canvasQuery.isSuccess ? parseCanvasChatMessages(canvasQuery.data?.chatJson ?? null) : [];

    let localMessages: CanvasChatMessage[] = [];
    try {
      localMessages = parseCanvasChatMessages(localStorage.getItem(localChatKey));
    } catch {
      localMessages = [];
    }

    const chosen = remoteMessages.length ? remoteMessages : localMessages;
    setMessages(chosen);

    const serialized = serializeCanvasChatMessages(chosen);
    lastSavedChatRef.current = serialized;
    try {
      if (serialized) {
        localStorage.setItem(localChatKey, serialized);
      } else {
        localStorage.removeItem(localChatKey);
      }
    } catch {
      // ignore
    }

    chatHydratingRef.current = false;
  }, [authenticated, canvasQuery.data?.chatJson, canvasQuery.isError, canvasQuery.isSuccess, localChatKey, ready, setMessages]);

  const saveChat = useMemo(
    () =>
      debounce((chatJson: string | null) => {
        if (!canvasQuery.data) return;
        updateCanvas.mutate({
          param: { id: canvasId },
          json: { chatJson },
        });
      }, 900),
    [canvasId, canvasQuery.data, updateCanvas],
  );

  useEffect(() => {
    return () => {
      saveChat.cancel();
    };
  }, [saveChat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ready || !authenticated) return;
    if (chatHydratingRef.current) return;
    if (boardCrashMessage) return;

    const serialized = serializeCanvasChatMessages(messages);
    if (serialized === lastSavedChatRef.current) return;

    if (serialized.length > MAX_CANVAS_CHAT_CHARS) {
      if (!oversizeChatRef.current) {
        oversizeChatRef.current = true;
        toast.error("Chat history is too large to auto-save. Consider clearing older messages.", {
          duration: 3500,
        });
      }
      return;
    }
    oversizeChatRef.current = false;

    lastSavedChatRef.current = serialized;

    try {
      if (serialized) {
        localStorage.setItem(localChatKey, serialized);
      } else {
        localStorage.removeItem(localChatKey);
      }
    } catch {
      // ignore
    }

    saveChat(serialized);
  }, [authenticated, boardCrashMessage, localChatKey, messages, ready, saveChat]);
};
