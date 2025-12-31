"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { toast } from "sonner";
import { fabric } from "fabric";

import type { Editor } from "@/features/editor/types";
import { JSON_KEYS } from "@/features/editor/types";
import {
  alignToWorkspace,
  applyTextHierarchy,
  replaceWithTemplate,
  type PigcassoTemplate,
  type PigcassoTemplateInput,
  type PigcassoVariant,
} from "@/features/editor/pigcasso-actions";
import { applyCanvasOps, applyCanvasOpsToCanvas, buildCanvasSnapshot } from "@/features/editor/pigcasso-canvas-ops";
import type { CanvasOp, CanvasSnapshot } from "@/lib/pigcasso-assistant-protocol";

import { cn } from "@/lib/utils";
import { client } from "@/lib/hono";
import { readApiResponse } from "@/lib/api-response";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfirm } from "@/hooks/use-confirm";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type PendingAction =
  | { type: "align"; mode: "center" | "left" | "right" | "top" | "bottom" }
  | { type: "textHierarchy" }
  | {
      type: "template";
      template: PigcassoTemplate;
      variant: PigcassoVariant;
      content?: PigcassoTemplateInput;
    }
  | {
      type: "variants";
      template: PigcassoTemplate;
      content?: PigcassoTemplateInput;
    };
type CanvasEditsAction = {
  type: "canvasEdits";
  ops: CanvasOp[];
  snapshot: CanvasSnapshot;
  baseJson: string;
};

type PendingActionWithDraft = PendingAction | CanvasEditsAction;

const inferTemplateFromText = (text: string): PigcassoTemplate | null => {
  const t = text.toLowerCase();
  if (t.includes("ama")) return "ama";
  if (t.includes("announcement") || text.includes("公告")) return "announcement";
  if (t.includes("banner") || t.includes("event") || text.includes("活動"))
    return "event-banner";
  return null;
};

const extractField = (text: string, keys: string[]) => {
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*[:：]\\s*(.+)`, "i");
    const match = text.match(re);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
};

const parseTemplateInput = (text: string): PigcassoTemplateInput | undefined => {
  const title = extractField(text, ["title", "標題"]);
  const subtitle = extractField(text, ["subtitle", "sub", "副標", "副標題"]);
  const datetime = extractField(text, ["time", "datetime", "時間", "日期"]);
  const cta = extractField(text, ["cta", "calltoaction", "連結", "按鈕"]);

  if (!title && !subtitle && !datetime && !cta) return undefined;
  return {
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(datetime ? { datetime } : {}),
    ...(cta ? { cta } : {}),
  };
};

const inferActionFromText = (text: string): PendingAction | null => {
  const t = text.toLowerCase();
  const wantsVariants = t.includes("variant") || text.includes("版本") || text.includes("三個版本");

  if (text.includes("置中") || t.includes("center")) {
    return { type: "align", mode: "center" };
  }
  if (text.includes("置頂") || t.includes("top")) {
    return { type: "align", mode: "top" };
  }
  if (text.includes("置底") || t.includes("bottom")) {
    return { type: "align", mode: "bottom" };
  }
  if (text.includes("左對齊") || t.includes("align left")) {
    return { type: "align", mode: "left" };
  }
  if (text.includes("右對齊") || t.includes("align right")) {
    return { type: "align", mode: "right" };
  }

  if (text.includes("字級") || t.includes("hierarchy")) {
    return { type: "textHierarchy" };
  }

  const template = inferTemplateFromText(text);
  if (template) {
    const content = parseTemplateInput(text);
    if (wantsVariants) {
      return { type: "variants", template, content };
    }
    return { type: "template", template, variant: "centered", content };
  }

  if (wantsVariants) {
    const content = parseTemplateInput(text);
    return { type: "variants", template: "ama", content };
  }

  return null;
};

export const PigcassoAssistant = ({ editor }: { editor: Editor | undefined }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const suppressBubbleClickRef = useRef(false);
  const dragStateRef = useRef<{
    kind: "bubble" | "header";
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    hasMoved: boolean;
    lastPos: { x: number; y: number };
    captureEl: HTMLElement;
  } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pigcasso-assistant:pos:v1");
      if (!raw) {
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "x" in parsed &&
        "y" in parsed &&
        typeof (parsed as { x?: unknown }).x === "number" &&
        typeof (parsed as { y?: unknown }).y === "number"
      ) {
        setPosition({ x: (parsed as { x: number }).x, y: (parsed as { y: number }).y });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!position) {
      return;
    }
    localStorage.setItem("pigcasso-assistant:pos:v1", JSON.stringify(position));
  }, [position]);

  const applyPositionToDom = (pos: { x: number; y: number }) => {
    if (!containerRef.current) {
      return;
    }
    containerRef.current.style.left = `${pos.x}px`;
    containerRef.current.style.top = `${pos.y}px`;
    containerRef.current.style.right = "auto";
    containerRef.current.style.bottom = "auto";
  };

  const clampToViewport = (pos: { x: number; y: number }, size: { w: number; h: number }) => {
    const margin = 12;
    const maxX = Math.max(margin, window.innerWidth - size.w - margin);
    const maxY = Math.max(margin, window.innerHeight - size.h - margin);
    return {
      x: Math.min(Math.max(pos.x, margin), maxX),
      y: Math.min(Math.max(pos.y, margin), maxY),
    };
  };

  useEffect(() => {
    if (!containerRef.current || position) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: Math.max(12, window.innerWidth - rect.width - 16),
      y: Math.max(12, window.innerHeight - rect.height - 16),
    });
  }, [position]);

  useEffect(() => {
    if (!containerRef.current || !position) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setPosition((prev) => {
      if (!prev) return prev;
      return clampToViewport(prev, { w: rect.width, h: rect.height });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!position) {
      return;
    }

    const onResize = () => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setPosition((prev) => {
        if (!prev) return prev;
        return clampToViewport(prev, { w: rect.width, h: rect.height });
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const DRAG_THRESHOLD_PX = 2;

  const startDrag = (e: React.PointerEvent<HTMLElement>, kind: "bubble" | "header") => {
    e.preventDefault();
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const origin = position ?? { x: rect.left, y: rect.top };

    if (!position) {
      setPosition(origin);
      applyPositionToDom(origin);
    }

    if (kind === "bubble") {
      suppressBubbleClickRef.current = false;
    }

    dragStateRef.current = {
      kind,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: origin.x,
      originY: origin.y,
      width: rect.width,
      height: rect.height,
      hasMoved: false,
      lastPos: origin,
      captureEl: e.currentTarget,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent<HTMLElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) {
      return;
    }

    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (!state.hasMoved && distance < DRAG_THRESHOLD_PX) {
      return;
    }

    if (!state.hasMoved) {
      state.hasMoved = true;
      if (state.kind === "bubble") {
        suppressBubbleClickRef.current = true;
      }
    }

    const next = clampToViewport(
      {
        x: state.originX + deltaX,
        y: state.originY + deltaY,
      },
      { w: state.width, h: state.height },
    );

    state.lastPos = next;
    applyPositionToDom(next);
  };

  const onDragEnd = (e: React.PointerEvent<HTMLElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) {
      return;
    }

    try {
      state.captureEl.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (state.hasMoved) {
      setPosition(state.lastPos);
    }

    dragStateRef.current = null;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! I can help you edit your canvas. Try: Center / Text hierarchy / AMA / 3 variants",
    },
  ]);
  const [pending, setPending] = useState<PendingActionWithDraft | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [previewingDraft, setPreviewingDraft] = useState(false);

  const [ConfirmDialog, confirm] = useConfirm(
    "Replace current design?",
    "This will replace all objects on the canvas (except the workspace background).",
  );

  const quickActions = useMemo(
    () => [
      { label: "Center", action: { type: "align", mode: "center" } as const },
      { label: "Text hierarchy", action: { type: "textHierarchy" } as const },
      {
        label: "AMA",
        action: {
          type: "template",
          template: "ama",
          variant: "centered",
        } as const,
      },
      {
        label: "3 Variants",
        action: { type: "variants", template: "ama" } as const,
      },
    ],
    [],
  );

  const addAssistantMessage = (text: string) => {
    setMessages((m) => [...m, { role: "assistant", text }]);
  };

  const addUserMessage = (text: string) => {
    setMessages((m) => [...m, { role: "user", text }]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();
    if (!text) return;

    addUserMessage(text);
    setInput("");

    const action = inferActionFromText(text);
    if (!action) {
      setAiThinking(true);
      try {
        const snapshot = editor ? buildCanvasSnapshot(editor) : null;
        const baseJson = editor
          ? JSON.stringify(editor.canvas.toJSON(JSON_KEYS))
          : null;

        const response = await client.api.assistant.action.$post({
          json: {
            input: text,
            ...(snapshot ? { canvas: snapshot } : {}),
          },
        });

        const body = await readApiResponse<{
          data?: { reply?: unknown; action?: unknown };
        }>(response, "Assistant request failed");

        const reply = body?.data?.reply;
        const nextAction = body?.data?.action;

        if (typeof reply === "string" && reply.trim()) {
          addAssistantMessage(reply);
        } else {
          addAssistantMessage("OK. What would you like to change on the canvas?");
        }

        setDraftPreviewUrl(null);
        if (
          nextAction &&
          typeof nextAction === "object" &&
          "type" in nextAction &&
          (nextAction as { type?: unknown }).type === "canvasEdits" &&
          Array.isArray((nextAction as { ops?: unknown }).ops) &&
          snapshot &&
          baseJson
        ) {
          const ops = (nextAction as unknown as { ops: unknown[] }).ops as CanvasOp[];
          setPending({
            type: "canvasEdits",
            ops,
            snapshot,
            baseJson,
          });
        } else {
          setPending(nextAction as PendingAction | null);
        }
      } catch (error) {
        addAssistantMessage(
          error instanceof Error ? error.message : "Assistant request failed",
        );
        setPending(null);
        setDraftPreviewUrl(null);
      } finally {
        setAiThinking(false);
      }
      return;
    }

    setPending(action);
    setDraftPreviewUrl(null);

    if (action.type === "align") {
      addAssistantMessage(`Ready: align ${action.mode}. Click Apply to run it.`);
      return;
    }

    if (action.type === "textHierarchy") {
      addAssistantMessage("Ready: apply text hierarchy (title/subtitle/cta).");
      return;
    }

    if (action.type === "variants") {
      addAssistantMessage("Pick a variant, then click Apply to replace the canvas.");
      return;
    }

    if (action.type === "template") {
      addAssistantMessage(
        `Ready: create a ${action.template} layout (${action.variant}). Click Apply to replace the canvas.`,
      );
    }
  };

  const createDraftPreview = async (draft: CanvasEditsAction) => {
    const margin = 24;
    const base = JSON.parse(draft.baseJson);

    const canvasEl = document.createElement("canvas");
    const previewCanvas = new fabric.Canvas(canvasEl, {
      width: Math.round(draft.snapshot.workspace.width + margin * 2),
      height: Math.round(draft.snapshot.workspace.height + margin * 2),
      selection: false,
    });

    return await new Promise<string>((resolve, reject) => {
      previewCanvas.loadFromJSON(base, () => {
        try {
          const workspace = previewCanvas
            .getObjects()
            .find((o) => o.name === "clip") as fabric.Rect | undefined;
          if (!workspace) {
            reject(new Error("Workspace not found"));
            return;
          }

          const rect = workspace.getBoundingRect(true, true);
          const shiftX = margin - rect.left;
          const shiftY = margin - rect.top;

          for (const obj of previewCanvas.getObjects()) {
            obj.set({
              left: (obj.left ?? 0) + shiftX,
              top: (obj.top ?? 0) + shiftY,
            });
            obj.setCoords();
          }

          previewCanvas.clipPath = workspace;

          applyCanvasOpsToCanvas({
            canvas: previewCanvas,
            ops: draft.ops,
            snapshot: draft.snapshot,
            fireEvents: false,
          });

          previewCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          previewCanvas.renderAll();

          const workspaceRect = workspace.getBoundingRect(true, true);
          const dataUrl = previewCanvas.toDataURL({
            format: "png",
            quality: 1,
            left: workspaceRect.left,
            top: workspaceRect.top,
            width: workspaceRect.width,
            height: workspaceRect.height,
            multiplier: 0.5,
          });

          previewCanvas.dispose();
          resolve(dataUrl);
        } catch (err) {
          previewCanvas.dispose();
          reject(err instanceof Error ? err : new Error("Failed to build preview"));
        }
      });
    });
  };

  const applyPending = async (override?: PendingAction) => {
    if (!editor) {
      toast.error("Editor not ready yet.");
      return;
    }

    const action = override ?? pending;
    if (!action) return;

    try {
      if (action.type === "canvasEdits") {
        applyCanvasOps({
          editor,
          ops: action.ops,
          snapshot: action.snapshot,
        });
        setPending(null);
        setDraftPreviewUrl(null);
        toast.success("Applied draft edits.");
        return;
      }

      if (action.type === "align") {
        alignToWorkspace(editor, action.mode);
        setPending(null);
        setDraftPreviewUrl(null);
        toast.success("Applied alignment.");
        return;
      }

      if (action.type === "textHierarchy") {
        applyTextHierarchy(editor);
        setPending(null);
        setDraftPreviewUrl(null);
        toast.success("Applied text hierarchy.");
        return;
      }

      if (action.type === "variants") {
        return;
      }

      if (action.type === "template") {
        const hasObjects = editor.canvas
          .getObjects()
          .some((o) => o.name !== "clip");

        if (hasObjects) {
          const ok = await confirm();
          if (!ok) return;
        }

        replaceWithTemplate(editor, {
          template: action.template,
          variant: action.variant,
          content: action.content,
        });
        setPending(null);
        setDraftPreviewUrl(null);
        toast.success("Applied layout.");
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed.");
    }
  };

  const variantOptions: Array<{
    key: PigcassoVariant;
    label: string;
    description: string;
  }> = [
    { key: "centered", label: "Centered", description: "Clean, centered card." },
    { key: "split", label: "Split", description: "Left card with right accent." },
    { key: "diagonal", label: "Diagonal", description: "Angled accent for energy." },
  ];

  return (
    <div
      ref={containerRef}
      className="fixed z-[60]"
      style={position ? { left: position.x, top: position.y } : { right: 16, bottom: 16 }}
    >
      <ConfirmDialog />

      {!open ? (
        <Button
          type="button"
          onClick={() => {
            if (suppressBubbleClickRef.current) {
              suppressBubbleClickRef.current = false;
              return;
            }
            setOpen(true);
          }}
          onPointerDown={(e) => startDrag(e, "bubble")}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="rounded-full h-14 w-14 p-0 shadow-lg bg-white border border-border hover:bg-muted/30 cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <Image
            src="/logo-pig.png"
            alt="Pigcasso Assistant"
            width={44}
            height={44}
            className="rounded-full"
          />
        </Button>
      ) : (
        <div className="w-[340px] h-[460px] bg-white border rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none touch-none"
              onPointerDown={(e) => startDrag(e, "header")}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                <Image src="/logo-pig.png" alt="Pigcasso" width={26} height={26} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Pigcasso Assistant</div>
                <div className="text-[11px] text-muted-foreground">
                  Draft → Apply to canvas
                </div>
              </div>
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-3 py-2 border-b flex flex-wrap gap-2">
            {quickActions.map((qa) => (
              <Button
                key={qa.label}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPending(qa.action as PendingAction);
                  addAssistantMessage(`Ready: ${qa.label}. Click Apply.`);
                }}
                className="h-8"
              >
                {qa.label}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-sm rounded-xl px-3 py-2 max-w-[90%]",
                    m.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "bg-[#111827] text-white ml-auto",
                  )}
                >
                  {m.text}
                </div>
              ))}
              {aiThinking ? (
                <div className="text-xs text-muted-foreground">
                  Thinking…
                </div>
              ) : null}

              {pending?.type === "variants" ? (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Variants for <span className="font-medium">{pending.template}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {variantOptions.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() =>
                          setPending({
                            type: "template",
                            template: pending.template,
                            variant: v.key,
                            content: pending.content,
                          })
                        }
                        className="rounded-lg border p-3 text-left hover:bg-muted transition"
                      >
                        <div className="font-medium text-sm">{v.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {pending?.type === "canvasEdits" ? (
                <div className="mt-2 space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Draft edits ready. Preview before applying.
                  </div>

                  {draftPreviewUrl ? (
                    <div className="rounded-lg border overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draftPreviewUrl} alt="Draft preview" className="w-full h-auto" />
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={previewingDraft}
                      onClick={async () => {
                        if (previewingDraft) return;
                        setPreviewingDraft(true);
                        try {
                          const url = await createDraftPreview(pending);
                          setDraftPreviewUrl(url);
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Failed to generate preview",
                          );
                        } finally {
                          setPreviewingDraft(false);
                        }
                      }}
                    >
                      {previewingDraft ? "Previewing…" : "Preview"}
                    </Button>
                    <Button type="button" onClick={() => applyPending()} disabled={!editor}>
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPending(null);
                        setDraftPreviewUrl(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <div className="p-3 border-t space-y-2">
            <form onSubmit={onSubmit} className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Example: Make this an AMA post. Title: Pigcasso. Time: Jan 1, 2025 8pm. CTA: Join us."
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button type="submit" variant="secondary" className="flex-1">
                  Send
                </Button>
                <Button
                  type="button"
                  onClick={() => applyPending()}
                  disabled={
                    !pending || pending.type === "variants" || pending.type === "canvasEdits"
                  }
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </form>
            {pending?.type === "variants" ? (
              <div className="text-xs text-muted-foreground">
                Select a variant above to enable Apply.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
