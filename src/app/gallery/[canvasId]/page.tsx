"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Bookmark, Heart, Loader2, Sparkles } from "lucide-react";
import { loadSnapshot, type Editor as TldrawEditor } from "tldraw";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/clipboard";
import { getAppOrigin } from "@/lib/app-origin";
import { sanitizeTldrawStoreSnapshot } from "@/features/canvases/tldraw/sanitize-snapshot";
import { parseCanvasChatMessages } from "@/features/canvases/lib/chat-history";
import { HtmlCardShapeUtil } from "@/features/canvases/tldraw/html-card-shape";
import { PigcassoTextShapeUtil } from "@/features/canvases/tldraw/pigcasso-text-shape-util";
import { useGetGalleryCanvas } from "@/features/gallery/api/use-get-gallery-canvas";
import { useToggleGalleryBookmark } from "@/features/gallery/api/use-toggle-gallery-bookmark";
import { useToggleGalleryLike } from "@/features/gallery/api/use-toggle-gallery-like";
import { useOpenApp } from "@/features/marketing/hooks/use-open-app";

const Tldraw = dynamic(() => import("@tldraw/tldraw").then((mod) => mod.Tldraw), { ssr: false });

type PageProps = { params: { canvasId: string } };

const getPublicShareUrl = (canvasId: string) => `${getAppOrigin()}/gallery/${encodeURIComponent(canvasId)}`;

export default function GalleryCanvasPage({ params }: PageProps) {
  const canvasId = params.canvasId;
  const { ready, authenticated, login } = usePrivy();
  const { openApp, opening } = useOpenApp();
  const [editor, setEditor] = useState<TldrawEditor | null>(null);

  const tldrawLicenseKey = (process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ?? "").trim();
  const isProdBuild = process.env.NODE_ENV === "production";
  const tldrawLicenseMissing = isProdBuild && !tldrawLicenseKey;

  const canvasQuery = useGetGalleryCanvas(canvasId);
  const toggleLike = useToggleGalleryLike();
  const toggleBookmark = useToggleGalleryBookmark();

  const shapeUtils = useMemo(() => [PigcassoTextShapeUtil, HtmlCardShapeUtil], []);
  const tldrawComponents = useMemo(() => {
    function ErrorFallback({ error }: { error: unknown }) {
      console.error("[tldraw] crashed", error);
      toast.error("Board crashed. Reload to continue.");
      return null;
    }

    return { ErrorFallback };
  }, []);

  const snapshot = canvasQuery.data?.snapshot ?? null;
  const messages = useMemo(
    () => parseCanvasChatMessages(canvasQuery.data?.chatJson ?? null),
    [canvasQuery.data?.chatJson],
  );

  const requireLogin = async () => {
    if (!ready) {
      toast.message("Loading…");
      return false;
    }
    if (authenticated) return true;
    await login();
    return true;
  };

  const onMount = (next: unknown) => {
    const nextEditor = next as TldrawEditor;
    setEditor(nextEditor);
  };

  useEffect(() => {
    if (!editor) return;
    try {
      editor.updateInstanceState({ isReadonly: true } as any);
      editor.setCurrentTool("hand" as any);
    } catch {
      // ignore
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (!snapshot) return;

    try {
      const parsed = JSON.parse(snapshot) as any;
      const doc = parsed && typeof parsed === "object" ? (parsed.document ?? parsed) : parsed;
      loadSnapshot(editor.store, sanitizeTldrawStoreSnapshot(doc) as any);
    } catch {
      // ignore
    }
  }, [editor, snapshot]);

  const focusShape = (shapeId: string) => {
    if (!editor) return;
    try {
      editor.setSelectedShapes?.([shapeId] as any);
      editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="relative h-[100svh] overflow-hidden">
        {tldrawLicenseMissing ? (
          <div className="absolute inset-0 z-[60] grid place-items-center bg-background/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-md rounded-2xl border bg-card shadow-soft p-5 space-y-3">
              <div className="text-sm font-semibold">Missing tldraw license key</div>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                Production deployments of tldraw require a license key. Set{" "}
                <span className="font-mono">NEXT_PUBLIC_TLDRAW_LICENSE_KEY</span> in Vercel (or{" "}
                <span className="font-mono">.env.local</span>) and redeploy.
              </div>
            </div>
          </div>
        ) : (
          <Tldraw
            hideUi
            inferDarkMode={false}
            licenseKey={tldrawLicenseKey || undefined}
            shapeUtils={shapeUtils}
            components={tldrawComponents}
            className="pigcasso-paper-tldraw"
            onMount={onMount}
          />
        )}

        <div className="absolute left-4 top-4 z-50 flex items-center gap-2">
          <Button type="button" variant="secondary" className="rounded-full" asChild>
            <Link href="/gallery">
              <ArrowLeft className="size-4 mr-2" />
              Gallery
            </Link>
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={() => {
              const url = getPublicShareUrl(canvasId);
              void copyTextToClipboard(url).then((ok) => {
                toast.message(ok ? "Link copied." : "Failed to copy.");
              });
            }}
          >
            Share
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            onClick={() => void openApp(`/canvas/${encodeURIComponent(canvasId)}`)}
            disabled={opening}
          >
            {opening ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
            Open app
          </Button>
        </div>

        <div className="absolute right-4 top-4 z-50 flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={cn(
              "rounded-full h-10 w-10",
              canvasQuery.data?.viewer?.hasLiked ? "text-pink-600" : "text-muted-foreground",
            )}
            onClick={async () => {
              const ok = await requireLogin();
              if (!ok) return;
              toggleLike.mutate({ id: canvasId });
            }}
            disabled={toggleLike.isPending}
            aria-label="Like"
          >
            <Heart className={cn("size-4", canvasQuery.data?.viewer?.hasLiked ? "fill-current" : undefined)} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={cn(
              "rounded-full h-10 w-10",
              canvasQuery.data?.viewer?.hasBookmarked ? "text-foreground" : "text-muted-foreground",
            )}
            onClick={async () => {
              const ok = await requireLogin();
              if (!ok) return;
              toggleBookmark.mutate({ id: canvasId });
            }}
            disabled={toggleBookmark.isPending}
            aria-label="Bookmark"
          >
            <Bookmark
              className={cn("size-4", canvasQuery.data?.viewer?.hasBookmarked ? "fill-current" : undefined)}
            />
          </Button>
        </div>

        <aside className="hidden md:flex absolute right-4 top-16 bottom-4 z-40 w-[460px] max-w-[calc(100vw-24px)] rounded-2xl border border-border/60 bg-card/90 backdrop-blur shadow-soft overflow-hidden flex-col">
          <div className="p-5 border-b border-border/60 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex size-6 rounded-full bg-gradient-to-tr from-primary to-cyan-400 items-center justify-center overflow-hidden shadow-sm">
                <Image src="/logo-pig.png" alt="Pigcasso" width={24} height={24} className="h-full w-full object-cover" />
              </span>
              {canvasQuery.data?.name ?? "Board"}
            </div>
            <div className="text-xs text-muted-foreground">
              {canvasQuery.data?.author?.name ? `by ${canvasQuery.data.author.name}` : "by Anonymous"} •{" "}
              {canvasQuery.data ? `${canvasQuery.data.stats.likes} likes` : "—"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {canvasQuery.isLoading ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                <Loader2 className="size-4 mr-2 animate-spin" />
                Loading…
              </div>
            ) : canvasQuery.isError ? (
              <div className="rounded-xl border bg-background/70 p-3 text-sm text-muted-foreground">
                {canvasQuery.error?.message || "Failed to load."}
              </div>
            ) : messages.length ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    message.role === "user" ? "bg-background/70" : "bg-muted/40",
                  )}
                >
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                    {message.role === "user" ? "Creator" : "Pigcasso"}
                  </div>
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed">{message.content}</div>

                  {message.attachments?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
                          onClick={() => focusShape(att.shapeId)}
                        >
                          <span className="text-muted-foreground">@</span>
                          <span>{att.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No chat history.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
