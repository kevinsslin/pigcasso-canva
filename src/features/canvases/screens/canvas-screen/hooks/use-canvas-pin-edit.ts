"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import type { SelectionContext } from "@/features/canvases/lib/selection-context";
import { getPinEditTrigger, isClickWithinThreshold, type PinEditTrigger } from "@/features/canvases/lib/pin-edit";
import { toTldrawToolId, type CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { getTabAnchor } from "@/features/canvases/tldraw/tab-anchor";

export type PinEditAnchor = {
  screenX: number;
  screenY: number;
  pagePoint: { x: number; y: number };
  shapeId: string | null;
};

type UseCanvasPinEditParams = {
  editor: TldrawEditor | null;
  activeTool: CanvasTool;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  selectionContext: SelectionContext | null;
  setActiveTool: (tool: CanvasTool) => void;
  setMobileChatOpen: (open: boolean) => void;
};

export const useCanvasPinEdit = ({
  editor,
  activeTool,
  boardHydrated,
  boardCrashMessage,
  selectionContext,
  setActiveTool,
  setMobileChatOpen,
}: UseCanvasPinEditParams) => {
  const tabPointerDownRef = useRef<{ x: number; y: number; trigger: PinEditTrigger } | null>(null);
  const [tabAnchor, setTabAnchor] = useState<PinEditAnchor | null>(null);
  const [tabInstruction, setTabInstruction] = useState("");
  const [clickEditArmed, setClickEditArmed] = useState(false);

  useEffect(() => {
    if (activeTool === "select") return;
    tabPointerDownRef.current = null;
    setTabAnchor(null);
    setClickEditArmed(false);
  }, [activeTool]);

  const openPinnedEditPopover = useCallback(
    (anchor: { screenPoint: { x: number; y: number }; pagePoint: { x: number; y: number }; shapeId: string | null }) => {
      if (typeof window === "undefined") return;

      const popoverWidth = 420;
      const popoverHeight = 260;
      const padding = 12;
      const offset = 12;

      const rawX = anchor.screenPoint.x + offset;
      const rawY = anchor.screenPoint.y + offset;

      const maxX = window.innerWidth - popoverWidth - padding;
      const maxY = window.innerHeight - popoverHeight - padding;

      const screenX = Math.max(padding, Math.min(rawX, maxX));
      const screenY = Math.max(padding, Math.min(rawY, maxY));

      setTabAnchor({
        screenX,
        screenY,
        pagePoint: anchor.pagePoint,
        shapeId: anchor.shapeId,
      });
      setTabInstruction("");
    },
    [],
  );

  const ensureSelectTool = useCallback(() => {
    if (activeTool === "select") return;
    setActiveTool("select");
    try {
      editor?.setCurrentTool(toTldrawToolId("select") as any);
    } catch {
      // ignore
    }
  }, [activeTool, editor, setActiveTool]);

  const tryOpenFromSelection = useCallback(
    (options?: { closeMobile?: boolean }) => {
      if (!editor) return false;
      const selectedId = selectionContext?.shapeId ?? null;
      if (!selectedId) return false;
      try {
        const bounds = editor.getShapePageBounds?.(selectedId as any) as any;
        const pageToScreen = (editor as any).pageToScreen as
          | ((pt: { x: number; y: number }) => { x: number; y: number })
          | undefined;
        if (bounds && typeof pageToScreen === "function") {
          const pagePoint = { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
          const screenPoint = pageToScreen(pagePoint);
          openPinnedEditPopover({ screenPoint, pagePoint, shapeId: selectedId });
          setClickEditArmed(false);
          if (options?.closeMobile) {
            setMobileChatOpen(false);
          }
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    },
    [editor, openPinnedEditPopover, selectionContext, setMobileChatOpen],
  );

  const handleTogglePinEdit = useCallback(
    (options?: { closeMobile?: boolean }) => {
      ensureSelectTool();

      if (!editor || !boardHydrated || boardCrashMessage) {
        toast.message("Canvas is still loading. Try again in a moment.", { duration: 2200 });
        return;
      }

      if (tryOpenFromSelection({ closeMobile: options?.closeMobile })) return;

      setClickEditArmed((current) => {
        const next = !current;
        if (next) {
          toast.message(options?.closeMobile ? "Tap on the canvas to pin an edit." : "Click on the canvas to pin an edit.", {
            duration: 2200,
          });
          if (options?.closeMobile) {
            setMobileChatOpen(false);
          }
        }
        return next;
      });
    },
    [boardCrashMessage, boardHydrated, editor, ensureSelectTool, setMobileChatOpen, tryOpenFromSelection],
  );

  const handleCanvasPointerDownCapture = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (activeTool !== "select") return;
      if (event.button !== 0) return;
      const trigger = getPinEditTrigger({ altKey: event.altKey, armed: clickEditArmed });
      if (!trigger) return;
      tabPointerDownRef.current = { x: event.clientX, y: event.clientY, trigger };
    },
    [activeTool, clickEditArmed],
  );

  const handleCanvasPointerUpCapture = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (activeTool !== "select") return;
      if (!editor) return;
      if (event.button !== 0) return;

      const down = tabPointerDownRef.current;
      tabPointerDownRef.current = null;
      if (!down) return;

      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      if (!isClickWithinThreshold({ dx, dy })) return;

      try {
        if (down.trigger === "pin") {
          setClickEditArmed(false);
        }

        const anchor = getTabAnchor(editor as any, { x: event.clientX, y: event.clientY });
        if (anchor.shapeId) {
          try {
            editor.setSelectedShapes?.([anchor.shapeId] as any);
          } catch {
            // ignore
          }
        }

        openPinnedEditPopover(anchor);
      } catch {
        // ignore
      }
    },
    [activeTool, editor, openPinnedEditPopover],
  );

  return {
    clickEditArmed,
    setClickEditArmed,
    tabAnchor,
    setTabAnchor,
    tabInstruction,
    setTabInstruction,
    tabPointerDownRef,
    handleCanvasPointerDownCapture,
    handleCanvasPointerUpCapture,
    onDesktopTogglePinEdit: () => handleTogglePinEdit(),
    onMobileTogglePinEdit: () => handleTogglePinEdit({ closeMobile: true }),
  };
};
