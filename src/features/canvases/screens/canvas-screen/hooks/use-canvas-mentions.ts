"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Editor as TldrawEditor } from "tldraw";

import { applyAtMentionReplacementAtCursor, getActiveAtMentionAtCursor } from "@/features/canvases/lib/at-mentions";
import { getSelectionContext } from "@/features/canvases/lib/selection-context";

type MentionPickerAnchor = { screenX: number; screenY: number } | null;

export type MentionableShape = {
  shapeId: string;
  label: string;
  type: string;
};

type UseCanvasMentionsParams = {
  editor: TldrawEditor | null;
  chatInput: string;
  chatInputRef: { current: string };
  chatCursorIndexRef: { current: number | null };
  setChatInput: (value: string) => void;
  setPinnedShapeIds: Dispatch<SetStateAction<string[]>>;
  desktopChatInputElRef: { current: HTMLTextAreaElement | null };
  mobileChatInputElRef: { current: HTMLTextAreaElement | null };
};

export const useCanvasMentions = ({
  editor,
  chatInput,
  chatInputRef,
  chatCursorIndexRef,
  setChatInput,
  setPinnedShapeIds,
  desktopChatInputElRef,
  mobileChatInputElRef,
}: UseCanvasMentionsParams) => {
  const [mentionPicker, setMentionPicker] = useState<MentionPickerAnchor>(null);
  const mentionFocusElRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionCursorIndexRef = useRef<number | null>(null);

  const activeAtMention = useMemo(() => {
    const el = mentionFocusElRef.current;
    const cursor =
      typeof el?.selectionStart === "number"
        ? el.selectionStart
        : chatCursorIndexRef.current ?? chatInput.length;
    return getActiveAtMentionAtCursor(chatInput, cursor);
  }, [chatCursorIndexRef, chatInput]);

  const openMentionPicker = useCallback((el?: HTMLTextAreaElement | null) => {
    if (typeof window === "undefined") return;
    const anchor = el ?? mentionFocusElRef.current ?? null;
    if (!anchor) return;

    mentionFocusElRef.current = anchor;
    mentionCursorIndexRef.current = typeof anchor.selectionStart === "number" ? anchor.selectionStart : null;
    const rect = anchor.getBoundingClientRect();

    const popoverWidth = 320;
    const popoverHeight = 260;
    const padding = 12;
    const offset = 8;

    const rawX = rect.left;
    const rawY = rect.top - popoverHeight - offset;

    const maxX = window.innerWidth - popoverWidth - padding;
    const maxY = window.innerHeight - popoverHeight - padding;

    const screenX = Math.max(padding, Math.min(rawX, maxX));
    const screenY = Math.max(padding, Math.min(rawY, maxY));

    setMentionPicker({ screenX, screenY });
  }, []);

  const closeMentionPicker = useCallback(() => {
    setMentionPicker(null);
    mentionCursorIndexRef.current = null;
    try {
      mentionFocusElRef.current?.focus();
    } catch {
      // ignore
    }
  }, []);

  const mentionableShapes = useMemo(() => {
    if (!editor) return [];
    if (!mentionPicker) return [];
    const shapes = editor.getCurrentPageShapes?.() ?? [];
    return shapes
      .map((shape: any) => {
        const shapeId = String(shape?.id ?? "");
        if (!shapeId) return null;
        const ctx = getSelectionContext(editor as any, shapeId);
        const label = ctx?.label ?? String(shape?.type ?? "shape");
        return { shapeId, label, type: ctx?.type ?? String(shape?.type ?? "shape") };
      })
      .filter(Boolean) as MentionableShape[];
  }, [editor, mentionPicker]);

  const filteredMentionShapes = useMemo(() => {
    if (!mentionPicker) return [];
    const query = activeAtMention?.query?.trim().toLowerCase() ?? "";
    if (!query) return mentionableShapes.slice(0, 12);
    return mentionableShapes
      .filter((item) => item.label.toLowerCase().includes(query) || item.type.toLowerCase().includes(query))
      .slice(0, 12);
  }, [activeAtMention?.query, mentionPicker, mentionableShapes]);

  useEffect(() => {
    if (!mentionPicker) return;
    if (!activeAtMention) {
      closeMentionPicker();
      return;
    }
  }, [activeAtMention, closeMentionPicker, mentionPicker]);

  const pickMention = useCallback(
    (item: MentionableShape) => {
      setPinnedShapeIds((current) => (current.includes(item.shapeId) ? current : [...current, item.shapeId]));
      const el = mentionFocusElRef.current;
      const cursor =
        typeof el?.selectionStart === "number"
          ? el.selectionStart
          : mentionCursorIndexRef.current ?? chatCursorIndexRef.current ?? chatInputRef.current.length;

      const replaced = applyAtMentionReplacementAtCursor(chatInputRef.current, item.label, cursor);
      chatInputRef.current = replaced.value;
      setChatInput(replaced.value);
      chatCursorIndexRef.current = replaced.cursorIndex;
      closeMentionPicker();

      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          try {
            const target = mentionFocusElRef.current;
            target?.focus();
            target?.setSelectionRange(replaced.cursorIndex, replaced.cursorIndex);
          } catch {
            // ignore
          }
        });
      }
    },
    [chatCursorIndexRef, chatInputRef, closeMentionPicker, setChatInput, setPinnedShapeIds],
  );

  const triggerMentionPicker = useCallback(
    (input: HTMLTextAreaElement | null) => {
      if (!input) return;
      mentionFocusElRef.current = input;
      input.focus();
      const cursor = typeof input.selectionStart === "number" ? input.selectionStart : chatInputRef.current.length;
      const active = getActiveAtMentionAtCursor(chatInputRef.current, cursor);
      if (!active) {
        const before = chatInputRef.current.slice(0, cursor);
        const after = chatInputRef.current.slice(cursor);
        const needsSpace = before.trim().length > 0 && !/\s$/.test(before);
        const insertion = `${needsSpace ? " " : ""}@`;
        const next = `${before}${insertion}${after}`;
        const nextCursor = before.length + insertion.length;
        chatInputRef.current = next;
        setChatInput(next);
        chatCursorIndexRef.current = nextCursor;
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            try {
              input.focus();
              input.setSelectionRange(nextCursor, nextCursor);
            } catch {
              // ignore
            }
          });
        }
      } else {
        chatCursorIndexRef.current = cursor;
      }
      openMentionPicker(input);
    },
    [chatCursorIndexRef, chatInputRef, openMentionPicker, setChatInput],
  );

  const onDesktopMentionButtonClick = useCallback(() => {
    triggerMentionPicker(desktopChatInputElRef.current);
  }, [desktopChatInputElRef, triggerMentionPicker]);

  const onMobileMentionButtonClick = useCallback(() => {
    triggerMentionPicker(mobileChatInputElRef.current);
  }, [mobileChatInputElRef, triggerMentionPicker]);

  return {
    mentionPicker,
    openMentionPicker,
    closeMentionPicker,
    activeAtMention,
    filteredMentionShapes,
    pickMention,
    onDesktopMentionButtonClick,
    onMobileMentionButtonClick,
  };
};
