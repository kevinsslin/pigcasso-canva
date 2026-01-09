"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Bot,
  ChevronLeft,
  Frame,
  Hand,
  Loader2,
  MousePointer2,
  Pencil,
  Plus,
  TextCursor,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import debounce from "lodash.debounce";
import { getSnapshot, loadSnapshot, type Editor as TldrawEditor, useTldrawUser } from "tldraw";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { UserButton } from "@/features/auth/components/user-button";
import { useGenerateImage } from "@/features/ai/api/use-generate-image";
import { useEditImage } from "@/features/ai/api/use-edit-image";
import { useGenerateHtml } from "@/features/ai/api/use-generate-html";
import { useGetCanvas } from "@/features/canvases/api/use-get-canvas";
import { useUpsertCanvas } from "@/features/canvases/api/use-upsert-canvas";
import { useUpdateCanvas } from "@/features/canvases/api/use-update-canvas";
import { createHtmlCardSrcDoc, HTML_CARD_SHAPE_TYPE, upsertHtmlCard } from "@/features/canvases/tldraw/html-card";
import { HtmlCardShapeUtil } from "@/features/canvases/tldraw/html-card-shape";
import { cn } from "@/lib/utils";
import { getApiErrorStatus } from "@/lib/api-error";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

import { FloatingSidebar } from "@/components/app-shell/floating-sidebar";
import { CanvasShareButton } from "@/features/canvases/components/canvas-share-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const Tldraw = dynamic(() => import("@tldraw/tldraw").then((mod) => mod.Tldraw), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <Loader2 className="size-6 text-muted-foreground animate-spin" />
    </div>
  ),
});

type PageProps = {
  params: { canvasId: string };
};

type CanvasTool = "select" | "hand" | "draw" | "text" | "frame";

const TOOL_BUTTONS: Array<{ tool: CanvasTool; label: string; icon: ComponentType<{ className?: string }> }> = [
  { tool: "select", label: "Select", icon: MousePointer2 },
  { tool: "hand", label: "Pan", icon: Hand },
  { tool: "draw", label: "Draw", icon: Pencil },
  { tool: "text", label: "Text", icon: TextCursor },
  { tool: "frame", label: "Frame", icon: Frame },
];

const DOCK_BUTTONS = TOOL_BUTTONS;

export default function CanvasPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, authenticated } = useRequireAuth(`/canvas/${params.canvasId}`);

  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [canvasName, setCanvasName] = useState("Untitled");
  const [busy, setBusy] = useState(false);
  const [panelTab, setPanelTab] = useState<"chat" | "preview">("chat");
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  const chatInputRef = useRef(chatInput);
  const busyRef = useRef(busy);

  const localSnapshotKey = useMemo(() => `pigcasso:canvas:${params.canvasId}:snapshot`, [params.canvasId]);
  const tldrawUser = useTldrawUser({
    userPreferences: useMemo(() => ({ id: "pigcasso", colorScheme: "light" as const }), []),
  });
  const shapeUtils = useMemo(() => [HtmlCardShapeUtil], []);

  const generateImage = useGenerateImage();
  const editImage = useEditImage();
  const generateHtml = useGenerateHtml();

  const canvasQuery = useGetCanvas(params.canvasId, { enabled: ready && authenticated });
  const upsertCanvas = useUpsertCanvas({ toast: false });
  const updateCanvas = useUpdateCanvas({ toast: false, invalidate: false, invalidateList: false });

  const hasUpsertedRef = useRef(false);
  const hasLoadedSnapshotRef = useRef(false);
  const hasAutoPromptRef = useRef(false);
  const hydratingRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    chatInputRef.current = chatInput;
  }, [chatInput]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (!canvasQuery.isError) return;

    const status = getApiErrorStatus(canvasQuery.error);
    if (status !== 404) return;
    if (hasUpsertedRef.current) return;

    hasUpsertedRef.current = true;
    upsertCanvas.mutate({ id: params.canvasId, name: "Untitled" });
  }, [authenticated, canvasQuery.error, canvasQuery.isError, params.canvasId, ready, upsertCanvas]);

  useEffect(() => {
    const serverName = canvasQuery.data?.name;
    if (!serverName) return;
    setCanvasName(serverName);
  }, [canvasQuery.data?.name]);

  useEffect(() => {
    if (!editor) return;
    if (hasLoadedSnapshotRef.current) return;
    if (!canvasQuery.isError && !canvasQuery.isSuccess) return;

    hasLoadedSnapshotRef.current = true;
    hydratingRef.current = true;

    const tryLoad = (raw: string) => {
      try {
        const snapshot = JSON.parse(raw) as unknown;
        loadSnapshot(editor.store, snapshot as any);
        lastSavedSnapshotRef.current = raw;
        try {
          localStorage.setItem(localSnapshotKey, raw);
        } catch {
          // ignore
        }
        return true;
      } catch {
        return false;
      }
    };

    const serverSnapshot = canvasQuery.data?.snapshot ?? null;
    if (serverSnapshot) {
      tryLoad(serverSnapshot);
    } else {
      try {
        const local = localStorage.getItem(localSnapshotKey);
        if (local) {
          tryLoad(local);
        }
      } catch {
        // ignore
      }
    }

    hydratingRef.current = false;
  }, [canvasQuery.data, canvasQuery.isError, canvasQuery.isSuccess, editor, localSnapshotKey]);

  useEffect(() => {
    if (!editor) return;

    const save = debounce(() => {
      if (hydratingRef.current) return;

      let snapshotJson: string;
      try {
        snapshotJson = JSON.stringify(getSnapshot(editor.store));
      } catch {
        return;
      }

      if (snapshotJson === lastSavedSnapshotRef.current) return;
      lastSavedSnapshotRef.current = snapshotJson;

      try {
        localStorage.setItem(localSnapshotKey, snapshotJson);
      } catch {
        // ignore
      }

      if (canvasQuery.data) {
        updateCanvas.mutate({
          param: { id: params.canvasId },
          json: { snapshot: snapshotJson },
        });
      }
    }, 1100);

    const unsubscribe = editor.store.listen(() => {
      save();
    });

    return () => {
      unsubscribe();
      save.cancel();
    };
  }, [canvasQuery.data, editor, localSnapshotKey, params.canvasId, updateCanvas]);

  useEffect(() => {
    if (!editor) return;

    const imageUrl = searchParams?.get("image");
    if (!imageUrl) return;

    const insert = async () => {
      try {
        await editor.putExternalContent({
          type: "url",
          url: imageUrl,
          point: editor.screenToPage({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          }),
        });
      } catch {
        // ignore
      } finally {
        if (imageUrl) {
          updateCanvas.mutate({
            param: { id: params.canvasId },
            json: { coverImageUrl: imageUrl },
          });
        }
        router.replace(`/canvas/${params.canvasId}`);
      }
    };

    void insert();
  }, [editor, params.canvasId, router, searchParams, updateCanvas]);

  const sendMessage = useCallback(async (value?: string) => {
    const trimmed = (value ?? chatInputRef.current).trim();
    if (!trimmed) return;
    setPanelTab("chat");

    if (!editor) {
      toast.message("Canvas is still loading. Try again in a moment.", { duration: 2500 });
      return;
    }
    if (busyRef.current) {
      toast.message("Pigcasso is still working…", { duration: 2000 });
      return;
    }

    busyRef.current = true;
    chatInputRef.current = "";
    setBusy(true);
    setChatInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);

    const selectedShapeId = (() => {
      try {
        return editor.getSelectedShapeIds?.()?.[0] ?? null;
      } catch {
        return null;
      }
    })();

    const selectedShape = selectedShapeId ? (editor.getShape(selectedShapeId) as any) : null;

    try {
      const looksLikeHtmlPrompt =
        /^\/?html\b/i.test(trimmed) ||
        /landing page|website|web page|html/i.test(trimmed);

      if (looksLikeHtmlPrompt) {
        const res = await generateHtml.mutateAsync({ prompt: trimmed });
        const html = res.data.html;
        setHtmlPreview(html);
        setPanelTab("preview");
        let htmlCardMode: "created" | "updated" | "failed" = "failed";
        try {
          const point = editor.screenToPage({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
          const existingShapeId = selectedShape?.type === HTML_CARD_SHAPE_TYPE ? selectedShapeId ?? undefined : undefined;
          const result = upsertHtmlCard(editor as any, { html, point, existingShapeId: existingShapeId ?? undefined });
          htmlCardMode = result.mode;
        } catch {
          // ignore (preview still available in the side panel)
        }
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              htmlCardMode === "updated"
                ? "Updated your HTML card (Preview tab available)."
                : htmlCardMode === "created"
                  ? "Added an HTML card to your canvas (Preview tab available)."
                  : "Generated HTML (Preview tab available).",
          },
        ]);
        return;
      }

      if (selectedShape?.type === "image" && selectedShape?.props?.assetId) {
        const asset = editor.getAsset?.(selectedShape.props.assetId) as any;
        const src = asset?.props?.src as string | undefined;

        if (!src) {
          throw new Error("Selected image is missing a source URL.");
        }

        const res = await editImage.mutateAsync({
          image: src,
          instruction: trimmed,
        });

        const uploadedUrl = await uploadImageDataUrl(res.data, `pigcasso_edit_${Date.now()}.png`);

        try {
          editor.updateAssets?.([{ ...asset, props: { ...asset.props, src: uploadedUrl } }]);
        } catch {
          // ignore
        }

        updateCanvas.mutate({
          param: { id: params.canvasId },
          json: { coverImageUrl: uploadedUrl },
        });

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "Updated the selected image." },
        ]);
        return;
      }

      const generated = await generateImage.mutateAsync({
        prompt: trimmed,
        canvas: { width: 1024, height: 1024 },
      });

      const uploadedUrl = await uploadImageDataUrl(generated.data, `pigcasso_${Date.now()}.png`);

      await editor.putExternalContent({
        type: "url",
        url: uploadedUrl,
        point: editor.screenToPage({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        }),
      });

      updateCanvas.mutate({
        param: { id: params.canvasId },
        json: { coverImageUrl: uploadedUrl },
      });

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: "Added a new image to your canvas." },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message, { duration: 3500 });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: message }]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [editImage, editor, generateHtml, generateImage, params.canvasId, updateCanvas]);

  useEffect(() => {
    if (!editor) return;

    const prompt = searchParams?.get("prompt");
    if (!prompt) return;
    if (hasAutoPromptRef.current) return;

    hasAutoPromptRef.current = true;
    setChatInput(prompt);
    void sendMessage(prompt);
    router.replace(`/canvas/${params.canvasId}`);
  }, [editor, params.canvasId, router, searchParams, sendMessage]);

  if (!ready || !authenticated) {
    return (
      <div className="h-[100dvh] w-[100dvw] grid place-items-center bg-background">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="pigcasso-paper-theme h-[100dvh] w-[100dvw] overflow-hidden bg-background flex flex-col">
      <FloatingSidebar />
      <header className="h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
              aria-label="Back to app"
            >
              <span className="md:hidden inline-flex items-center justify-center rounded-full border bg-card/80 backdrop-blur h-9 w-9">
                <ChevronLeft className="size-4" />
              </span>
              <span className="hidden md:inline-flex size-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 text-primary-foreground items-center justify-center font-black">
                P
              </span>
            </Link>
            <div className="text-sm font-semibold text-muted-foreground">
              Canvas <span className="text-foreground">•</span>{" "}
              <span className="text-foreground">{canvasName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-lg border bg-card px-2 py-1 shadow-soft">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => editor?.zoomOut()}
                disabled={!editor}
                aria-label="Zoom out"
              >
                <ZoomOut className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => editor?.zoomIn()}
                disabled={!editor}
                aria-label="Zoom in"
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => setMobileChatOpen(true)}
              aria-label="Open chat"
            >
              <Bot className="size-4" />
            </Button>

            <CanvasShareButton canvasId={params.canvasId} className="hidden md:inline-flex" />
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-0">
            <Tldraw
              hideUi
              user={tldrawUser}
              inferDarkMode={false}
              shapeUtils={shapeUtils}
              className="pigcasso-paper-tldraw"
              onMount={(next) => {
                setEditor(next as unknown as TldrawEditor);
                return () => setEditor(null);
              }}
            />
          </div>

          <aside className="absolute left-24 top-4 z-20 hidden md:flex flex-col gap-2">
            <div className="rounded-2xl border bg-card/80 backdrop-blur shadow-soft p-2 flex flex-col gap-1">
              {TOOL_BUTTONS.map(({ tool, label, icon: Icon }) => (
                <Button
                  key={tool}
                  type="button"
                  size="icon"
                  variant={activeTool === tool ? "default" : "ghost"}
                  className="rounded-xl"
                  onClick={() => {
                    setActiveTool(tool);
                    if (!editor) return;
                    const tldrawTool = tool === "frame" ? "frame" : tool;
                    try {
                      editor.setCurrentTool(tldrawTool as any);
                    } catch {
                      // ignore
                    }
                  }}
                  disabled={!editor}
                  aria-label={label}
                >
                  <Icon className="size-4" />
                </Button>
              ))}
            </div>
          </aside>

          <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
            <div className="h-[72px] px-2 flex items-center gap-1 overflow-x-auto">
              {DOCK_BUTTONS.map(({ tool, label, icon: Icon }) => (
                <Button
                  key={tool}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActiveTool(tool);
                    if (!editor) return;
                    const tldrawTool = tool === "frame" ? "frame" : tool;
                    try {
                      editor.setCurrentTool(tldrawTool as any);
                    } catch {
                      // ignore
                    }
                  }}
                  disabled={!editor}
                  className={cn(
                    "min-w-[72px] h-[60px] px-3 flex flex-col items-center justify-center gap-1 rounded-xl",
                    activeTool === tool ? "bg-muted text-primary" : undefined,
                  )}
                  aria-label={label}
                >
                  <Icon className="size-5" />
                  <span className="text-[10px] leading-none">{label}</span>
                </Button>
              ))}

              <Button
                type="button"
                variant="ghost"
                onClick={() => setMobileChatOpen(true)}
                className="min-w-[72px] h-[60px] px-3 flex flex-col items-center justify-center gap-1 rounded-xl"
                aria-label="Chat"
              >
                <Bot className="size-5" />
                <span className="text-[10px] leading-none">Chat</span>
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={() => router.push("/app?new=1")}
                className="min-w-[72px] h-[60px] px-3 flex flex-col items-center justify-center gap-1 rounded-xl"
                aria-label="New"
              >
                <Plus className="size-5" />
                <span className="text-[10px] leading-none">New</span>
              </Button>
            </div>
          </nav>
        </div>

        <aside className="hidden md:flex h-full w-[400px] border-l border-border/60 bg-card/90 backdrop-blur flex-col">
          <div className="p-5 border-b border-border/60 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="size-4 text-muted-foreground" />
              Pigcasso Agent
            </div>
            <div className="text-xs text-muted-foreground">
              Create with prompts, then select something on the canvas to refine it.
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={panelTab === "chat" ? "default" : "secondary"}
                className="rounded-full"
                onClick={() => setPanelTab("chat")}
              >
                Chat
              </Button>
              <Button
                type="button"
                variant={panelTab === "preview" ? "default" : "secondary"}
                className="rounded-full"
                onClick={() => setPanelTab("preview")}
                disabled={!htmlPreview}
                title={!htmlPreview ? "Generate HTML in chat to enable preview" : undefined}
              >
                Preview
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {panelTab === "preview" ? (
              htmlPreview ? (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Preview is sandboxed for safety.
                  </div>
                  <div className="rounded-2xl border overflow-hidden bg-white">
                    <iframe
                      title="HTML preview"
                      sandbox="allow-scripts"
                      srcDoc={createHtmlCardSrcDoc(htmlPreview)}
                      className="w-full h-[520px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Ask for a landing page / HTML in chat to see a preview here.
                </div>
              )
            ) : messages.length ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-2xl border p-3 text-sm",
                    msg.role === "assistant" ? "bg-muted/40" : "bg-background",
                  )}
                >
                  <div className="text-xs font-semibold text-muted-foreground">
                    {msg.role === "assistant" ? "Pigcasso" : "You"}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Describe what you want to create, then refine by selecting parts on the canvas.
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full border bg-background px-4 py-2">
                <Input
                  value={chatInput}
                  onChange={(e) => {
                    chatInputRef.current = e.target.value;
                    setChatInput(e.target.value);
                  }}
                  placeholder="Type a prompt… (try: “landing page for…”)"
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={busy}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
              </div>

              <Button
                type="button"
                size="icon"
                className="rounded-full"
                onClick={() => void sendMessage()}
                disabled={!chatInput.trim() || busy}
                aria-label="Send"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </Button>
            </div>
          </div>
        </aside>
      </main>

      <Dialog open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
        <DialogContent className="left-0 top-0 h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 rounded-none p-0 gap-0">
          <div className="flex h-full flex-col bg-background">
            <div className="h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur flex items-center justify-between px-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bot className="size-4 text-muted-foreground" />
                Pigcasso Agent
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={panelTab === "chat" ? "default" : "secondary"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPanelTab("chat")}
                >
                  Chat
                </Button>
                <Button
                  type="button"
                  variant={panelTab === "preview" ? "default" : "secondary"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPanelTab("preview")}
                  disabled={!htmlPreview}
                >
                  Preview
                </Button>
                <Button type="button" variant="ghost" onClick={() => setMobileChatOpen(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {panelTab === "preview" ? (
                htmlPreview ? (
                  <div className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Preview is sandboxed for safety.
                    </div>
                    <div className="rounded-2xl border overflow-hidden bg-white">
                      <iframe
                        title="HTML preview"
                        sandbox="allow-scripts"
                        srcDoc={createHtmlCardSrcDoc(htmlPreview)}
                        className="w-full h-[70vh]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Ask for a landing page / HTML in chat to see a preview here.
                  </div>
                )
              ) : messages.length ? (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-2xl border p-3 text-sm",
                      msg.role === "assistant" ? "bg-muted/40" : "bg-background",
                    )}
                  >
                    <div className="text-xs font-semibold text-muted-foreground">
                      {msg.role === "assistant" ? "Pigcasso" : "You"}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  Describe what you want to create, then refine by selecting parts on the canvas.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/60 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-full border bg-background px-4 py-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => {
                      chatInputRef.current = e.target.value;
                      setChatInput(e.target.value);
                    }}
                    placeholder="Type a prompt…"
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={busy}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                </div>

                <Button
                  type="button"
                  size="icon"
                  className="rounded-full"
                  onClick={() => void sendMessage()}
                  disabled={!chatInput.trim() || busy}
                  aria-label="Send"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
