"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";
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

export const PigcassoAssistant = ({ editor }: { editor: Editor | undefined }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const pendingVoiceTranscriptRef = useRef("");
  const sendMessageRef = useRef<(text: string) => void>(() => {});
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
    if (typeof window === "undefined") {
      return;
    }

    const AnyWindow = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    const SpeechRecognitionCtor =
      (AnyWindow.SpeechRecognition as any) ?? (AnyWindow.webkitSpeechRecognition as any);

    if (!SpeechRecognitionCtor) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      let nextTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        nextTranscript += event.results[i][0]?.transcript ?? "";
      }
      pendingVoiceTranscriptRef.current = nextTranscript.trim();
      setInput(nextTranscript.trim());
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      const transcript = pendingVoiceTranscriptRef.current.trim();
      pendingVoiceTranscriptRef.current = "";
      if (transcript) {
        setInput("");
        sendMessageRef.current(transcript);
      }
    };

    recognitionRef.current = recognition;
  }, []);

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

  const DRAG_THRESHOLD_PX = 6;

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
      text: "Hi! I'm Pigcasso. Ask me to improve what’s on the canvas (or create a template). Try: “Make it more readable”, “Create 3 variants”, “Write a stronger headline”, “Make it more cyberpunk”.",
    },
  ]);
  const [pending, setPending] = useState<PendingActionWithDraft | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [previewingDraft, setPreviewingDraft] = useState(false);

  const [ConfirmDialog, confirm] = useConfirm(
    "Replace current design?",
    "This will replace all objects on the canvas (except the workspace background).",
  );

  const quickPrompts = useMemo(
    () => [
      { label: "Make it readable", prompt: "Make this design more readable and well-aligned." },
      { label: "3 variants", prompt: "Create 3 layout variants for this design." },
      { label: "Stronger headline", prompt: "Rewrite the headline to be punchier and clearer." },
      { label: "Cyberpunk vibe", prompt: "Make the style more cyberpunk (colors + typography) while keeping it readable." },
    ],
    [],
  );

  const addAssistantMessage = (text: string) => {
    setMessages((m) => [...m, { role: "assistant", text }]);
    if (!voiceEnabled) {
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = navigator.language || "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  const addUserMessage = (text: string) => {
    setMessages((m) => [...m, { role: "user", text }]);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || aiThinking) {
      return;
    }

    addUserMessage(trimmed);
    setPending(null);
    setDraftPreviewUrl(null);
    setAiThinking(true);

    try {
      const snapshot = editor ? buildCanvasSnapshot(editor) : null;
      const baseJson = editor ? JSON.stringify(editor.canvas.toJSON(JSON_KEYS)) : null;

      const response = await client.api.assistant.action.$post({
        json: {
          input: trimmed,
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
        addAssistantMessage("OK — what would you like to change on the canvas?");
      }

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
      addAssistantMessage(error instanceof Error ? error.message : "Assistant request failed");
      setPending(null);
      setDraftPreviewUrl(null);
    } finally {
      setAiThinking(false);
    }
  };

  sendMessageRef.current = (text: string) => void sendMessage(text);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const text = input.trim();
    if (!text) return;

    setInput("");
    void sendMessage(text);
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

      {open ? (
        <div className="w-[340px] h-[460px] bg-white border rounded-2xl shadow-xl overflow-hidden flex flex-col mb-3">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none touch-none"
              onPointerDown={(e) => startDrag(e, "header")}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                <Image src="/logo-pig.png" alt="Pigcasso" width={28} height={28} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Pigcasso Assistant</div>
                <div className="text-[11px] text-muted-foreground">Draft → Preview → Apply</div>
              </div>
              <GripVertical className="size-4 text-muted-foreground" />
            </div>
            <button
              type="button"
              onClick={() => setVoiceEnabled((prev) => !prev)}
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
              aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
            >
              {voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-3 py-2 border-b flex flex-wrap gap-2">
            {quickPrompts.map((qa) => (
              <Button
                key={qa.label}
                type="button"
                size="sm"
                variant="secondary"
                disabled={aiThinking}
                onClick={() => void sendMessage(qa.prompt)}
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
                <div className="text-xs text-muted-foreground">Thinking…</div>
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
                        <div className="text-xs text-muted-foreground">{v.description}</div>
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
                          toast.error(err instanceof Error ? err.message : "Failed to generate preview");
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
              ) : pending && pending.type !== "variants" ? (
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground">Action ready.</div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => applyPending()} disabled={!editor} className="flex-1">
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPending(null);
                        setDraftPreviewUrl(null);
                      }}
                      className="flex-1"
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
                placeholder="Ask anything… (e.g. “Make this an AMA post. Title: Pigcasso. Time: Jan 1, 2025 8pm. CTA: Join us.”)"
                rows={2}
                disabled={aiThinking}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const recognition = recognitionRef.current;
                    if (!recognition) {
                      toast.error("Voice input is not supported in this browser.");
                      return;
                    }
                    if (listening) {
                      recognition.stop();
                      return;
                    }
                    pendingVoiceTranscriptRef.current = "";
                    setInput("");
                    try {
                      setListening(true);
                      recognition.lang = navigator.language || "en-US";
                      recognition.start();
                    } catch {
                      setListening(false);
                    }
                  }}
                  disabled={aiThinking}
                  className="shrink-0"
                  aria-label={listening ? "Stop recording" : "Start recording"}
                >
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Button type="submit" variant="secondary" className="flex-1" disabled={aiThinking}>
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => {
          if (suppressBubbleClickRef.current) {
            suppressBubbleClickRef.current = false;
            return;
          }
          setOpen((prev) => !prev);
        }}
        onPointerDown={(e) => {
          if (open) {
            return;
          }
          startDrag(e, "bubble");
        }}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className="rounded-full h-16 w-16 p-0 shadow-xl bg-white border border-border hover:bg-muted/30 cursor-grab active:cursor-grabbing select-none touch-none"
      >
        <Image
          src="/logo-pig.png"
          alt="Pigcasso Assistant"
          width={52}
          height={52}
          className="rounded-full"
        />
      </Button>
    </div>
  );
};
