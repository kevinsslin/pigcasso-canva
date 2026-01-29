"use client";

import { useMemo } from "react";

import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";

export const useCanvasAttachments = (messages: CanvasChatMessage[]) => {
  const recentAttachments = useMemo(() => {
    const list: CanvasChatAttachment[] = [];
    messages.forEach((msg) => {
      (msg.attachments ?? []).forEach((att) => list.push(att));
    });
    return list.slice(-8);
  }, [messages]);

  const allAttachments = useMemo(() => {
    const list: CanvasChatAttachment[] = [];
    messages.forEach((msg) => {
      (msg.attachments ?? []).forEach((att) => list.push(att));
    });
    return list;
  }, [messages]);

  return {
    recentAttachments,
    allAttachments,
    hasOutputs: allAttachments.length > 0,
  };
};
