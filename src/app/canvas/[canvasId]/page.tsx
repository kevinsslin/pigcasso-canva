"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Bot,
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

export default function CanvasPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, authenticated } = useRequireAuth(`/canvas/${params.canvasId}`);

  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([]);

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
      <div className="h-screen w-screen grid place-items-center bg-background">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      <header className="h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 text-primary-foreground flex items-center justify-center font-black">
              P
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              ChatCanvas <span className="text-foreground">•</span>{" "}
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

            <Button type="button" variant="secondary" className="rounded-full" disabled>
              <Share2 className="size-4 mr-2" />
              Share
            </Button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <Tldraw
            persistenceKey={persistenceKey}
            hideUi
            onMount={(next) => {
              setEditor(next as unknown as TldrawEditor);
              return () => setEditor(null);
            }}
          />
        </div>

        <aside className="absolute left-4 top-4 z-20 flex flex-col gap-2">
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

        <aside className="absolute right-0 top-0 z-20 h-full w-[400px] max-w-[90vw] border-l border-border/60 bg-card/90 backdrop-blur flex flex-col">
          <div className="p-5 border-b border-border/60">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="size-4 text-muted-foreground" />
              Pigcasso Agent
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Talk · Tab · Tune (MVP): chat is wired next.
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
    </div>
  );
}
