"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ComponentType } from "react";
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
  Share2,
  TextCursor,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Editor as TldrawEditor } from "tldraw";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { UserButton } from "@/features/auth/components/user-button";
import { cn } from "@/lib/utils";

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

  const persistenceKey = useMemo(() => `pigcasso:chatcanvas:${params.canvasId}`, [params.canvasId]);

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
        router.replace(`/canvas/${params.canvasId}`);
      }
    };

    void insert();
  }, [editor, params.canvasId, router, searchParams]);

  if (!ready || !authenticated) {
    return (
      <div className="h-[100dvh] w-[100dvw] grid place-items-center bg-background">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-[100dvw] overflow-hidden bg-background flex flex-col">
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
              <span className="text-foreground">Untitled</span>
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

            <Button type="button" variant="secondary" className="rounded-full hidden md:inline-flex" disabled>
              <Share2 className="size-4 mr-2" />
              Share
            </Button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-0">
            <Tldraw
              persistenceKey={persistenceKey}
              hideUi
              onMount={(next) => {
                setEditor(next as unknown as TldrawEditor);
                return () => setEditor(null);
              }}
            />
          </div>

          <aside className="absolute left-4 top-4 z-20 hidden md:flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              className="rounded-full shadow-lg"
              onClick={() => router.push("/app?new=1")}
              aria-label="New"
            >
              <Plus className="size-4" />
            </Button>

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

          <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-[#fffdf7] dark:bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
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
          <div className="p-5 border-b border-border/60">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="size-4 text-muted-foreground" />
              Pigcasso Agent
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Describe what you want, then click anything on the canvas to refine.
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {messages.length ? (
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
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe what you want to change…"
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const trimmed = chatInput.trim();
                      if (!trimmed) return;
                      setMessages((prev) => [
                        ...prev,
                        { id: crypto.randomUUID(), role: "user", content: trimmed },
                      ]);
                      setChatInput("");
                    }
                  }}
                />
              </div>

              <Button
                type="button"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  const trimmed = chatInput.trim();
                  if (!trimmed) return;
                  setMessages((prev) => [
                    ...prev,
                    { id: crypto.randomUUID(), role: "user", content: trimmed },
                  ]);
                  setChatInput("");
                }}
                disabled={!chatInput.trim()}
                aria-label="Send"
              >
                <ArrowUp className="size-4" />
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
              <Button type="button" variant="ghost" onClick={() => setMobileChatOpen(false)}>
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.length ? (
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
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Describe what you want to change…"
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        const trimmed = chatInput.trim();
                        if (!trimmed) return;
                        setMessages((prev) => [
                          ...prev,
                          { id: crypto.randomUUID(), role: "user", content: trimmed },
                        ]);
                        setChatInput("");
                      }
                    }}
                  />
                </div>

                <Button
                  type="button"
                  size="icon"
                  className="rounded-full"
                  onClick={() => {
                    const trimmed = chatInput.trim();
                    if (!trimmed) return;
                    setMessages((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), role: "user", content: trimmed },
                    ]);
                    setChatInput("");
                  }}
                  disabled={!chatInput.trim()}
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
