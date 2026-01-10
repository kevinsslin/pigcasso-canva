"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Bot,
  ChevronLeft,
  Code2,
  Image as ImageIcon,
  Loader2,
  LocateFixed,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import debounce from "lodash.debounce";
import { loadSnapshot, type Editor as TldrawEditor, useTldrawUser } from "tldraw";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { UserButton } from "@/features/auth/components/user-button";
import { useGenerateImage } from "@/features/ai/api/use-generate-image";
import { useEditImage } from "@/features/ai/api/use-edit-image";
import { useGenerateHtml } from "@/features/ai/api/use-generate-html";
import { useGetCanvas } from "@/features/canvases/api/use-get-canvas";
import { useUpsertCanvas } from "@/features/canvases/api/use-upsert-canvas";
import { useUpdateCanvas } from "@/features/canvases/api/use-update-canvas";
import { HTML_CARD_SHAPE_TYPE, upsertHtmlCard } from "@/features/canvases/tldraw/html-card";
import { HtmlCardShapeUtil } from "@/features/canvases/tldraw/html-card-shape";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { getTabAnchor } from "@/features/canvases/tldraw/tab-anchor";
import { cn } from "@/lib/utils";
import { getApiErrorStatus } from "@/lib/api-error";
import { copyTextToClipboard } from "@/lib/clipboard";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

import { CanvasToolRail } from "@/features/canvases/components/canvas-tool-rail";
import { EditableBoardTitle } from "@/features/canvases/components/editable-board-title";
import { useBoardDisconnectGuard } from "@/features/canvases/hooks/use-board-disconnect-guard";
import { CANVAS_TOOL_BUTTONS, fromTldrawToolId, toTldrawToolId, type CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import { getPinEditTrigger, isClickWithinThreshold, type PinEditTrigger } from "@/features/canvases/lib/pin-edit";
import { isHtmlPrompt } from "@/features/canvases/lib/prompt-intent";
import { getSelectionContext, type SelectionContext } from "@/features/canvases/lib/selection-context";
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

const DOCK_BUTTONS: Array<{ tool: CanvasTool; label: string; icon: ComponentType<{ className?: string }> }> =
  CANVAS_TOOL_BUTTONS;

const QUICK_PROMPTS: Array<{ label: string; prompt: string }> = [
  { label: "Design", prompt: "Design a bold social post for a Web3 hackathon. Include a short headline and CTA." },
  { label: "Branding", prompt: "Create a minimal brand kit for Pigcasso (colors, typography, and tone)." },
  { label: "Illustration", prompt: "Generate a cute pig mascot illustration in a modern flat style, transparent background." },
  { label: "Video", prompt: "Storyboard a 10s promo video concept with 4 frames and short captions." },
  { label: "Website", prompt: "Landing page for Pigcasso: hero, features, social proof, CTA. Return HTML." },
];

type CanvasChatAttachment = {
  id: string;
  type: "image" | "html";
  label: string;
  shapeId: string;
  url?: string;
};

type CanvasChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: CanvasChatAttachment[];
};

const CanvasChatAttachmentChip = ({
  attachment,
  onClick,
}: {
  attachment: CanvasChatAttachment;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
    onClick={onClick}
  >
    {attachment.type === "image" ? (
      attachment.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.url} alt="" className="h-4 w-4 rounded-sm object-cover" />
      ) : (
        <ImageIcon className="size-3 text-muted-foreground" />
      )
    ) : (
      <Code2 className="size-3 text-muted-foreground" />
    )}
    <span className="max-w-[140px] truncate">{attachment.label}</span>
  </button>
);

export default function CanvasPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, authenticated } = useRequireAuth(`/canvas/${params.canvasId}`);
  const debug = searchParams?.get("debug") === "1";

  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [desktopChatOpen, setDesktopChatOpen] = useState(true);
  const [clickEditArmed, setClickEditArmed] = useState(false);
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<CanvasChatMessage[]>([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [canvasName, setCanvasName] = useState("Untitled");
  const [busy, setBusy] = useState(false);
  const [boardHydrated, setBoardHydrated] = useState(false);
  const [boardCrashMessage, setBoardCrashMessage] = useState<string | null>(null);
  const [tldrawMountKey, setTldrawMountKey] = useState(0);

  const chatInputRef = useRef(chatInput);
  const busyRef = useRef(busy);
  const outputCounterRef = useRef(1);
  const desktopChatEndRef = useRef<HTMLDivElement | null>(null);
  const mobileChatEndRef = useRef<HTMLDivElement | null>(null);

  const remountingRef = useRef(false);
  const reloadTimeoutRef = useRef<number | null>(null);
  const hasMountedEditorRef = useRef(false);
  const hasEverHydratedRef = useRef(false);
  const autoRecoverAttemptsRef = useRef(0);
  const disconnectStreakRef = useRef<{ startedAt: number; count: number }>({ startedAt: 0, count: 0 });
  const mountCountRef = useRef(0);
  const unmountCountRef = useRef(0);
  const lastMountAtRef = useRef<number | null>(null);
  const lastUnmountAtRef = useRef<number | null>(null);

  const localSnapshotKey = useMemo(() => `pigcasso:canvas:${params.canvasId}:snapshot`, [params.canvasId]);
  const tldrawUser = useTldrawUser({
    userPreferences: useMemo(() => ({ id: "pigcasso", colorScheme: "light" as const }), []),
  });
  const shapeUtils = useMemo(() => [HtmlCardShapeUtil], []);
  const tldrawComponents = useMemo(() => {
    function ErrorFallback({ error }: { error: unknown }) {
      useEffect(() => {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : null;
        const detail = stack ? `${message}\n\n${stack}` : message;
        console.error("[tldraw] crashed", error);
        setBoardCrashMessage(detail || "The board crashed unexpectedly.");
      }, [error]);

      return null;
    }

    return { ErrorFallback };
  }, []);

  const generateImage = useGenerateImage();
  const editImage = useEditImage();
  const generateHtml = useGenerateHtml();

  const canvasQuery = useGetCanvas(params.canvasId, { enabled: ready && authenticated });
  const upsertCanvas = useUpsertCanvas({ toast: false });
  const updateCanvas = useUpdateCanvas({ toast: false, invalidate: false, invalidateList: false });
  const renameCanvas = useUpdateCanvas({ toast: false, invalidate: false });

  const handleRenameBoard = useCallback(
    async (nextName: string) => {
      try {
        await renameCanvas.mutateAsync({
          param: { id: params.canvasId },
          json: { name: nextName },
        });
        setCanvasName(nextName);
        return;
      } catch (error) {
        const status = getApiErrorStatus(error);
        if (status !== 404) {
          toast.error((error as Error).message || "Failed to rename board");
          throw error;
        }
      }

      try {
        try {
          await upsertCanvas.mutateAsync({ id: params.canvasId, name: nextName });
        } catch (error) {
          const status = getApiErrorStatus(error);
          if (status !== 409) {
            throw error;
          }
        }

        await renameCanvas.mutateAsync({
          param: { id: params.canvasId },
          json: { name: nextName },
        });
        setCanvasName(nextName);
      } catch (error) {
        toast.error((error as Error).message || "Failed to rename board");
        throw error;
      }
    },
    [params.canvasId, renameCanvas, upsertCanvas],
  );

  const hasUpsertedRef = useRef(false);
  const loadedSnapshotEditorRef = useRef<TldrawEditor | null>(null);
  const hasAutoPromptRef = useRef(false);
  const hydratingRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const bootstrappedEditorRef = useRef<TldrawEditor | null>(null);
  const hasProxiedImageAssetsRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const hasShownRemoteSyncSkippedToastRef = useRef(false);
  const tabPointerDownRef = useRef<{ x: number; y: number; trigger: PinEditTrigger } | null>(null);
  const lastKnownToolIdRef = useRef<CanvasTool | null>(null);
  const lastZoomPercentRef = useRef<number | null>(null);
  const lastSelectionShapeIdRef = useRef<string | null>(null);
  const [tabAnchor, setTabAnchor] = useState<{
    screenX: number;
    screenY: number;
    pagePoint: { x: number; y: number };
    shapeId: string | null;
  } | null>(null);
  const [tabInstruction, setTabInstruction] = useState("");

  useEffect(() => {
    if (activeTool === "select") return;
    tabPointerDownRef.current = null;
    setTabAnchor(null);
    setClickEditArmed(false);
  }, [activeTool]);

  useEffect(() => {
    chatInputRef.current = chatInput;
  }, [chatInput]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const sync = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;

    try {
      if (document.fullscreenElement) {
        if (typeof document.exitFullscreen === "function") {
          await document.exitFullscreen();
        }
        return;
      }

      const target = document.documentElement;
      if (typeof target.requestFullscreen === "function") {
        await target.requestFullscreen();
        return;
      }

      toast.message("Fullscreen is not supported in this browser.", { duration: 2500 });
    } catch {
      toast.error("Failed to toggle fullscreen.", { duration: 2500 });
    }
  }, []);

  const removeSearchParamsFromUrl = useCallback((keys: string[]) => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      keys.forEach((key) => url.searchParams.delete(key));
      window.history.replaceState({}, "", url.toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raf = window.requestAnimationFrame(() => {
      desktopChatEndRef.current?.scrollIntoView({ block: "end" });
      mobileChatEndRef.current?.scrollIntoView({ block: "end" });
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [busy, mobileChatOpen, messages.length]);

  useEffect(() => {
    if (!boardHydrated) return;
    hasEverHydratedRef.current = true;
  }, [boardHydrated]);

  const handleTldrawMount = useCallback((next: unknown) => {
    const nextEditor = next as TldrawEditor;
    mountCountRef.current += 1;
    lastMountAtRef.current = Date.now();
    remountingRef.current = false;
    hasMountedEditorRef.current = true;

    if (typeof window !== "undefined" && reloadTimeoutRef.current) {
      window.clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }

    setBoardCrashMessage((current) =>
      current?.startsWith("Board disconnected") ? null : current,
    );
    setBoardHydrated(false);
    setEditor(nextEditor);

    const onCrash = (payload: unknown) => {
      const message =
        payload && typeof payload === "object" && "error" in payload && payload.error instanceof Error
          ? payload.error.message
          : "The board crashed unexpectedly.";
      setBoardCrashMessage(message);
      toast.error("Board crashed. Reload to continue.", { duration: 4000 });
    };

    try {
      nextEditor.on("crash" as any, onCrash as any);
    } catch {
      // ignore
    }

    return () => {
      unmountCountRef.current += 1;
      lastUnmountAtRef.current = Date.now();
      try {
        nextEditor.off("crash" as any, onCrash as any);
      } catch {
        // ignore
      }
      setEditor(null);
    };
  }, []);

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
    if (editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;
    if (!hasMountedEditorRef.current) return;
    if (remountingRef.current) return;
    setBoardHydrated(false);
  }, [boardCrashMessage, boardHydrated, editor]);

  const reloadBoard = useCallback(() => {
    remountingRef.current = true;

    if (typeof window !== "undefined") {
      if (reloadTimeoutRef.current) {
        window.clearTimeout(reloadTimeoutRef.current);
      }
      reloadTimeoutRef.current = window.setTimeout(() => {
        reloadTimeoutRef.current = null;
        remountingRef.current = false;
        setBoardCrashMessage("Board disconnected. Reload to continue.");
      }, 5000);
    }

    setBoardCrashMessage(null);
    setBoardHydrated(false);
    loadedSnapshotEditorRef.current = null;
    bootstrappedEditorRef.current = null;
    hydratingRef.current = false;
    lastKnownToolIdRef.current = null;
    hasProxiedImageAssetsRef.current = false;
    hasUserEditedRef.current = false;
    hasShownRemoteSyncSkippedToastRef.current = false;
    tabPointerDownRef.current = null;
    setTabAnchor(null);
    setActiveTool("select");
    setTldrawMountKey((prev) => prev + 1);
  }, []);

  const handleBoardDisconnect = useCallback(() => {
    const now = Date.now();
    const windowMs = 20_000;

    if (!disconnectStreakRef.current.startedAt || now - disconnectStreakRef.current.startedAt > windowMs) {
      disconnectStreakRef.current = { startedAt: now, count: 0 };
    }

    disconnectStreakRef.current.count += 1;
    autoRecoverAttemptsRef.current = disconnectStreakRef.current.count;

    if (disconnectStreakRef.current.count <= 2) {
      toast.message("Reconnecting board…", { duration: 1800 });
      reloadBoard();
      return;
    }

    setBoardCrashMessage(
      "Board disconnected repeatedly. Reload to continue.\n\nTip: open this board with ?debug=1 and share the debug panel + browser console logs.",
    );
  }, [reloadBoard]);

  useBoardDisconnectGuard({
    enabled: ready && authenticated,
    editor,
    boardHydrated: hasEverHydratedRef.current,
    boardCrashMessage,
    hasMountedEditor: hasMountedEditorRef.current,
    remounting: remountingRef.current,
    delayMs: 1200,
    onDisconnect: handleBoardDisconnect,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const handle = window.setTimeout(() => {
      disconnectStreakRef.current = { startedAt: 0, count: 0 };
      autoRecoverAttemptsRef.current = 0;
    }, 5000);

    return () => {
      window.clearTimeout(handle);
    };
  }, [boardCrashMessage, boardHydrated, editor]);

  useEffect(() => {
    const serverName = canvasQuery.data?.name;
    if (!serverName) return;
    setCanvasName(serverName);
  }, [canvasQuery.data?.name]);

  useEffect(() => {
    if (!editor) return;

    const tryLoad = (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as any;
        const snapshot = (() => {
          const doc = parsed && typeof parsed === "object" ? parsed.document : null;
          if (doc && typeof doc === "object" && "store" in doc) {
            return doc;
          }
          return parsed;
        })();
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

    const tryProxyImageAssets = () => {
      if (hasProxiedImageAssetsRef.current) return;
      hasProxiedImageAssetsRef.current = true;

      try {
        const snapshot = editor.store.getStoreSnapshot() as any;
        const records = snapshot?.store;
        if (!records || typeof records !== "object") return;

        const updates: any[] = [];
        Object.values(records).forEach((record) => {
          if (!record || typeof record !== "object") return;
          if ((record as any).typeName !== "asset") return;
          if ((record as any).type !== "image") return;
          const src = (record as any).props?.src;
          if (typeof src !== "string" || !src.trim()) return;
          const proxied = toCanvasImageUrl(src);
          if (proxied === src) return;
          updates.push({ ...(record as any), props: { ...(record as any).props, src: proxied } });
        });
        if (updates.length) {
          editor.updateAssets?.(updates);
        }
      } catch {
        // ignore
      }
    };

    const setHydrated = () => {
      setBoardHydrated(true);
    };

    const maybeLoadLocal = () => {
      try {
        const local = localStorage.getItem(localSnapshotKey);
        if (!local) return false;
        hydratingRef.current = true;
        loadedSnapshotEditorRef.current = editor;
        const ok = tryLoad(local);
        if (ok) {
          tryProxyImageAssets();
        }
        hydratingRef.current = false;
        return ok;
      } catch {
        hydratingRef.current = false;
        return false;
      }
    };

    const maybeLoadServer = (serverSnapshot: string) => {
      hydratingRef.current = true;
      loadedSnapshotEditorRef.current = editor;
      const ok = tryLoad(serverSnapshot);
      if (ok) {
        tryProxyImageAssets();
      }
      hydratingRef.current = false;
      return ok;
    };

    const serverSnapshot = canvasQuery.isSuccess ? (canvasQuery.data?.snapshot ?? null) : null;

    if (loadedSnapshotEditorRef.current !== editor) {
      const loadedLocal = maybeLoadLocal();
      if (!loadedLocal && serverSnapshot && !hasUserEditedRef.current) {
        maybeLoadServer(serverSnapshot);
      }

      if (!loadedLocal && !serverSnapshot && (canvasQuery.isError || canvasQuery.isSuccess) && !hydratingRef.current) {
        loadedSnapshotEditorRef.current = editor;
      }

      setHydrated();
      return;
    }

    if (serverSnapshot && serverSnapshot !== lastSavedSnapshotRef.current) {
      if (hasUserEditedRef.current) {
        if (!hasShownRemoteSyncSkippedToastRef.current) {
          hasShownRemoteSyncSkippedToastRef.current = true;
          toast.message("Board sync is taking longer—skipping remote snapshot to avoid overwriting your edits.", {
            duration: 3500,
          });
        }
      } else {
        maybeLoadServer(serverSnapshot);
      }
    }

    setHydrated();
  }, [boardHydrated, canvasQuery.data, canvasQuery.isError, canvasQuery.isSuccess, editor, localSnapshotKey]);

  useEffect(() => {
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    hasUserEditedRef.current = false;

    let ignore = true;
    let raf = 0;

    if (typeof window !== "undefined") {
      raf = window.requestAnimationFrame(() => {
        ignore = false;
      });
    } else {
      ignore = false;
    }

    const unsubscribe = editor.store.listen(
      () => {
        if (ignore) return;
        if (hydratingRef.current) return;
        hasUserEditedRef.current = true;
      },
      { source: "user", scope: "document" },
    );

    return () => {
      if (typeof window !== "undefined" && raf) {
        window.cancelAnimationFrame(raf);
      }
      unsubscribe();
    };
  }, [boardCrashMessage, boardHydrated, editor]);

  useEffect(() => {
    if (!editor) return;

    let raf = 0;

    const sync = () => {
      try {
        const currentToolId = editor.getCurrentToolId();
        if (currentToolId) {
          const mapped = fromTldrawToolId(currentToolId);
          if (mapped && lastKnownToolIdRef.current !== mapped) {
            lastKnownToolIdRef.current = mapped;
            setActiveTool(mapped);
          }
        }
      } catch {
        // ignore
      }

      try {
        const next = Math.round(editor.getZoomLevel() * 100);
        if (Number.isFinite(next) && lastZoomPercentRef.current !== next) {
          lastZoomPercentRef.current = next;
          setZoomPercent(next);
        }
      } catch {
        // ignore
      }

      try {
        const selected = (editor.getSelectedShapeIds?.() ?? [])[0] ?? null;
        if (selected !== lastSelectionShapeIdRef.current) {
          lastSelectionShapeIdRef.current = selected;
          setSelectionContext(getSelectionContext(editor, selected));
        }
      } catch {
        // ignore
      }
    };

    const onChange = () => {
      if (typeof window === "undefined") return;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    sync();
    try {
      editor.on("change" as any, onChange as any);
    } catch {
      // ignore
    }

    return () => {
      if (typeof window !== "undefined" && raf) {
        window.cancelAnimationFrame(raf);
      }
      try {
        editor.off("change" as any, onChange as any);
      } catch {
        // ignore
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (!canvasQuery.isError && !canvasQuery.isSuccess) return;
    if (loadedSnapshotEditorRef.current !== editor) return;
    if (bootstrappedEditorRef.current === editor) return;
    if (hydratingRef.current) return;

    bootstrappedEditorRef.current = editor;

    const shapes = editor.getCurrentPageShapes?.() ?? [];
    if (shapes.length > 0) return;

    try {
      const viewport = editor.getViewportPageBounds();
      const centerX = viewport.x + viewport.w / 2;
      const centerY = viewport.y + viewport.h / 2;
      const w = 960;
      const h = 600;

      editor.createShape({
        type: "frame",
        x: centerX - w / 2,
        y: centerY - h / 2,
        props: { w, h, name: "Frame 1", color: "black" },
      } as any);

      editor.zoomToFit({ animation: { duration: 220 } } as any);
    } catch {
      // ignore
    }
  }, [canvasQuery.isError, canvasQuery.isSuccess, editor]);

  useEffect(() => {
    if (!editor) return;

    let idleHandle: number | null = null;
    let idleMode: "idle" | "timeout" | null = null;

    const cancelIdle = () => {
      if (typeof window === "undefined") return;
      if (idleHandle === null || idleMode === null) return;
      try {
        if (idleMode === "idle" && typeof (window as any).cancelIdleCallback === "function") {
          (window as any).cancelIdleCallback(idleHandle);
        } else if (idleMode === "timeout") {
          window.clearTimeout(idleHandle);
        }
      } catch {
        // ignore
      } finally {
        idleHandle = null;
        idleMode = null;
      }
    };

    const save = debounce(() => {
      if (!boardHydrated) return;
      if (hydratingRef.current) return;
      if (boardCrashMessage) return;

      cancelIdle();

      const run = () => {
        let snapshotJson: string;
        try {
          snapshotJson = JSON.stringify(editor.store.getStoreSnapshot());
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
      };

      if (typeof window === "undefined") {
        run();
        return;
      }

      const requestIdle = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout?: number }) => number)
        | undefined;

      if (typeof requestIdle === "function") {
        idleMode = "idle";
        idleHandle = requestIdle(() => {
          idleHandle = null;
          idleMode = null;
          run();
        }, { timeout: 2000 });
        return;
      }

      idleMode = "timeout";
      idleHandle = window.setTimeout(() => {
        idleHandle = null;
        idleMode = null;
        run();
      }, 0);
    }, 1100);

    const unsubscribe = editor.store.listen(() => {
      save();
    });

    return () => {
      unsubscribe();
      save.cancel();
      cancelIdle();
    };
  }, [boardCrashMessage, boardHydrated, canvasQuery.data, editor, localSnapshotKey, params.canvasId, updateCanvas]);

	  useEffect(() => {
	    if (!editor) return;
	    if (!boardHydrated) return;
	    if (boardCrashMessage) return;

	    const imageUrl = searchParams?.get("image");
	    if (!imageUrl) return;

	    const insert = async () => {
	      try {
	        const boardImageUrl = toCanvasImageUrl(imageUrl);
	        const point = getAiInsertPoint(editor as any);
	        await withHistorySquash(editor as any, "insert:image", async () => {
	          await editor.putExternalContent({
	            type: "url",
	            url: boardImageUrl,
	            point,
	          });
	        });
	        try {
	          editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
        } catch {
          // ignore
        }
      } catch {
        // ignore
      } finally {
        updateCanvas.mutate({
          param: { id: params.canvasId },
          json: { coverImageUrl: imageUrl },
        });
        removeSearchParamsFromUrl(["image"]);
      }
    };

    void insert();
  }, [boardCrashMessage, boardHydrated, editor, params.canvasId, removeSearchParamsFromUrl, searchParams, updateCanvas]);

  type SendMessageOptions = {
    point?: { x: number; y: number };
    shapeId?: string | null;
  };

	  const sendMessage = useCallback(async (value?: string, options?: SendMessageOptions) => {
	    const trimmed = (value ?? chatInputRef.current).trim();
	    if (!trimmed) return;

    if (!editor || !boardHydrated || boardCrashMessage) {
      if (boardCrashMessage) {
        toast.error("Board is unavailable. Reload to continue.", { duration: 3000 });
        return;
      }
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

    const selectedShapeId =
      options?.shapeId !== undefined
        ? options.shapeId
        : (() => {
            try {
              return editor.getSelectedShapeIds?.()?.[0] ?? null;
            } catch {
              return null;
            }
          })();

    const selectedShape = selectedShapeId ? (editor.getShape(selectedShapeId as any) as any) : null;

    try {
      const looksLikeHtmlPrompt = isHtmlPrompt(trimmed);

      if (looksLikeHtmlPrompt) {
        const res = await generateHtml.mutateAsync({ prompt: trimmed });
        const html = res.data.html;
        let htmlCardMode: "created" | "updated" | "failed" = "failed";
        let htmlCardShapeId: string | null = null;
        try {
          const point = options?.point ?? getAiInsertPoint(editor as any);
          const existingShapeId =
            selectedShape?.type === HTML_CARD_SHAPE_TYPE ? selectedShapeId ?? undefined : undefined;
          const result = await withHistorySquash(editor as any, "ai:html", async () => {
            return upsertHtmlCard(editor as any, {
              html,
              point,
              existingShapeId: existingShapeId ?? undefined,
            });
          });
          htmlCardMode = result.mode;
          htmlCardShapeId = result.id;
          try {
            editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
          } catch {
            // ignore
          }
        } catch (error) {
          htmlCardMode = "failed";
          const copied = await copyTextToClipboard(html);
          toast.error(
            copied
              ? "Couldn’t add the HTML card. HTML copied to clipboard."
              : "Couldn’t add the HTML card to the canvas.",
            { duration: 3500 },
          );
        }

        const htmlAttachment: CanvasChatAttachment | null = htmlCardShapeId
          ? {
              id: crypto.randomUUID(),
              type: "html",
              label: `HTML_${String(outputCounterRef.current).padStart(4, "0")}`,
              shapeId: htmlCardShapeId,
            }
          : null;
        if (htmlAttachment) {
          outputCounterRef.current += 1;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              htmlCardMode === "updated"
                ? "Updated the HTML card on your canvas."
                : htmlCardMode === "created"
                  ? "Added an HTML card to your canvas."
                  : "Generated HTML, but couldn’t add it to the canvas.",
            attachments: htmlAttachment ? [htmlAttachment] : undefined,
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
	      const canvasUrl = toCanvasImageUrl(uploadedUrl);

	      try {
	        await withHistorySquash(editor as any, "ai:edit-image", async () => {
	          editor.updateAssets?.([{ ...asset, props: { ...asset.props, src: canvasUrl } }]);
	          if (selectedShapeId) {
	            editor.updateShape?.({
	              id: selectedShapeId as any,
	              type: "image",
	              props: { url: canvasUrl },
	            });
	          }
	        });
	      } catch {
          // ignore
        }

        updateCanvas.mutate({
          param: { id: params.canvasId },
          json: { coverImageUrl: uploadedUrl },
        });

	      const editAttachment: CanvasChatAttachment | null = selectedShapeId
	        ? {
	            id: crypto.randomUUID(),
	            type: "image",
	            label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
	            shapeId: selectedShapeId,
	            url: canvasUrl,
	          }
	        : null;
	      if (editAttachment) {
	        outputCounterRef.current += 1;
	      }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Updated the selected image.",
            attachments: editAttachment ? [editAttachment] : undefined,
          },
        ]);
        return;
      }

	      const generated = await generateImage.mutateAsync({
	        prompt: trimmed,
	        canvas: { width: 1024, height: 1024 },
	      });

	      const uploadedUrl = await uploadImageDataUrl(generated.data, `pigcasso_${Date.now()}.png`);
	      const canvasUrl = toCanvasImageUrl(uploadedUrl);

	      const point = options?.point ?? getAiInsertPoint(editor as any);
	      await withHistorySquash(editor as any, "ai:insert-image", async () => {
	        await editor.putExternalContent({
	          type: "url",
	          url: canvasUrl,
	          point,
	        });
	      });
      try {
        editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
      } catch {
        // ignore
      }

      updateCanvas.mutate({
        param: { id: params.canvasId },
        json: { coverImageUrl: uploadedUrl },
      });

      const insertedShapeId = (() => {
        try {
          return editor.getSelectedShapeIds?.()?.[0] ?? null;
        } catch {
          return null;
        }
      })();

	      const insertAttachment: CanvasChatAttachment | null = insertedShapeId
	        ? {
	            id: crypto.randomUUID(),
	            type: "image",
	            label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
	            shapeId: insertedShapeId,
	            url: canvasUrl,
	          }
	        : null;
      if (insertAttachment) {
        outputCounterRef.current += 1;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Added a new image to your canvas.",
          attachments: insertAttachment ? [insertAttachment] : undefined,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message, { duration: 3500 });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: message }]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
		  }, [boardCrashMessage, boardHydrated, editImage, editor, generateHtml, generateImage, params.canvasId, updateCanvas]);

  const focusShapeId = useCallback(
    (shapeId: string) => {
      if (!editor || !shapeId) return;
      try {
        editor.select(shapeId as any);
      } catch {
        // ignore
      }
      try {
        editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
      } catch {
        // ignore
      }
    },
    [editor],
  );

  const recentAttachments = useMemo(() => {
    const list: CanvasChatAttachment[] = [];
    messages.forEach((msg) => {
      (msg.attachments ?? []).forEach((att) => list.push(att));
    });
    return list.slice(-8);
  }, [messages]);

  useEffect(() => {
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const prompt = searchParams?.get("prompt");
    if (!prompt) return;
    if (hasAutoPromptRef.current) return;

    hasAutoPromptRef.current = true;
    setChatInput(prompt);
    void sendMessage(prompt);
    removeSearchParamsFromUrl(["prompt"]);
  }, [boardCrashMessage, boardHydrated, editor, params.canvasId, removeSearchParamsFromUrl, searchParams, sendMessage]);

	  if (!ready || !authenticated) {
	    return (
	      <div className="h-[100dvh] w-[100dvw] grid place-items-center bg-background">
	        <Loader2 className="size-6 text-muted-foreground animate-spin" />
	      </div>
	    );
	  }

  return (
    <div className="pigcasso-paper-theme h-[100dvh] w-[100dvw] overflow-hidden bg-background flex flex-col">
      <header className="h-14 px-4 flex items-center justify-between bg-transparent relative z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            aria-label="Back to app"
          >
            <span className="md:hidden inline-flex items-center justify-center rounded-full border bg-card/80 backdrop-blur h-9 w-9">
              <ChevronLeft className="size-4" />
            </span>
            <span className="hidden md:inline-flex size-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 text-primary-foreground items-center justify-center font-black shadow-lg shadow-pink-500/20">
              P
            </span>
          </Link>
          <EditableBoardTitle name={canvasName} onRename={handleRenameBoard} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1 rounded-full border bg-card/80 backdrop-blur px-2 py-1 shadow-soft">
          <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {editor ? `${zoomPercent}%` : "—"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hidden md:inline-flex"
            onClick={() => setDesktopChatOpen((current) => !current)}
            aria-label="Toggle chat panel"
          >
            {desktopChatOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hidden md:inline-flex"
            onClick={() => editor?.undo()}
            disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
            aria-label="Undo"
          >
            <Undo2 className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hidden md:inline-flex"
            onClick={() => editor?.redo()}
            disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
            aria-label="Redo"
          >
            <Redo2 className="size-4" />
          </Button>

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

          <CanvasShareButton canvasId={params.canvasId} className="hidden md:inline-flex" compact />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full hidden md:inline-flex"
            onClick={() => void toggleFullscreen()}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          <UserButton />
        </div>
      </header>

	      <main className="flex-1 overflow-hidden flex">
	        <CanvasToolRail
	          activeTool={activeTool}
	          disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
	          onToolChange={(tool) => {
	            setActiveTool(tool);
	            if (!editor) return;
            try {
              editor.setCurrentTool(toTldrawToolId(tool) as any);
            } catch {
              // ignore
            }
          }}
        />
	        <div className="flex-1 relative overflow-hidden">
		          <div
		            className="absolute inset-0 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-0"
		            onPointerDownCapture={(event) => {
		              if (activeTool !== "select") return;
		              if (event.button !== 0) return;
		              const trigger = getPinEditTrigger({ altKey: event.altKey, armed: clickEditArmed });
		              if (!trigger) return;
		              tabPointerDownRef.current = { x: event.clientX, y: event.clientY, trigger };
		            }}
		            onPointerUpCapture={(event) => {
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

                const popoverWidth = 360;
                const popoverHeight = 160;
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
              } catch {
                // ignore
              }
            }}
          >
		            <Tldraw
		              key={tldrawMountKey}
		              hideUi
		              user={tldrawUser}
		              inferDarkMode={false}
		              shapeUtils={shapeUtils}
		              components={tldrawComponents}
		              className="pigcasso-paper-tldraw"
		              onMount={handleTldrawMount}
		            />
	            {!boardHydrated ? (
	              <div className="absolute inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm">
	                <div className="rounded-2xl border bg-card/90 px-4 py-3 shadow-soft flex items-center gap-2 text-sm text-muted-foreground">
	                  <Loader2 className="size-4 animate-spin" />
	                  Loading board…
	                </div>
	              </div>
	            ) : null}
	            {boardCrashMessage ? (
	              <div className="absolute inset-0 z-[60] grid place-items-center bg-background/80 backdrop-blur-sm p-6">
	                <div className="w-full max-w-md rounded-2xl border bg-card shadow-soft p-5 space-y-3">
	                  <div className="text-sm font-semibold">
	                    {boardCrashMessage.startsWith("Board disconnected")
	                      ? "Board disconnected"
	                      : "Board crashed"}
	                  </div>
	                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">
	                    {boardCrashMessage}
	                  </div>
	                  <div className="flex items-center gap-2 pt-1">
		                    <Button
		                      type="button"
		                      className="rounded-full"
		                      onClick={reloadBoard}
	                    >
	                      <RotateCcw className="mr-2 size-4" />
	                      Reload board
	                    </Button>
	                    <Button
	                      type="button"
	                      variant="secondary"
	                      className="rounded-full"
	                      onClick={async () => {
	                        const copied = await copyTextToClipboard(boardCrashMessage);
	                        toast.message(copied ? "Copied error details." : "Couldn’t copy error details.", {
	                          duration: 2000,
	                        });
	                      }}
	                    >
	                      Copy error
	                    </Button>
	                    <Button
	                      type="button"
	                      variant="secondary"
	                      className="rounded-full"
	                      onClick={() => {
	                        setBoardCrashMessage(null);
	                      }}
	                    >
	                      Close
	                    </Button>
	                  </div>
	                </div>
	              </div>
	            ) : null}
	          </div>

	          {tabAnchor ? (
	            <div
	              className="fixed z-[60] w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border bg-card/90 backdrop-blur shadow-soft p-3"
	              style={{ left: tabAnchor.screenX, top: tabAnchor.screenY }}
	            >
	              <div className="flex items-center justify-between gap-2">
	                <div className="text-xs font-semibold text-muted-foreground">
	                  Pin edit {tabAnchor.shapeId ? "• selected object" : "• canvas region"}
	                </div>
	                <Button
	                  type="button"
	                  variant="ghost"
	                  size="icon"
	                  className="h-7 w-7"
	                  onClick={() => setTabAnchor(null)}
	                  aria-label="Close pin edit"
	                >
	                  <X className="size-4" />
	                </Button>
	              </div>

	              <div className="mt-2 flex items-center gap-2">
	                <Input
	                  value={tabInstruction}
	                  onChange={(e) => setTabInstruction(e.target.value)}
	                  placeholder="Describe the change…"
	                  className="h-10"
	                  autoFocus
	                  disabled={busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
	                  onKeyDown={(event) => {
	                    if (event.key === "Escape") {
	                      event.preventDefault();
	                      setTabAnchor(null);
                      return;
                    }
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      if (!tabInstruction.trim()) return;
                      const anchor = tabAnchor;
                      setTabAnchor(null);
                      void sendMessage(tabInstruction, { point: anchor.pagePoint, shapeId: anchor.shapeId });
                    }
                  }}
                />
		                <Button
		                  type="button"
		                  size="icon"
		                  className="rounded-full"
	                  disabled={
	                    !tabInstruction.trim() ||
	                    busy ||
	                    !editor ||
	                    !boardHydrated ||
	                    Boolean(boardCrashMessage)
	                  }
		                  aria-label="Send pin edit"
		                  onClick={() => {
		                    if (!tabInstruction.trim()) return;
		                    const anchor = tabAnchor;
	                    setTabAnchor(null);
	                    void sendMessage(tabInstruction, { point: anchor.pagePoint, shapeId: anchor.shapeId });
	                  }}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
		              </div>
	
		              <div className="mt-2 text-xs text-muted-foreground">
		                Tip: Alt+click (or tap the pin button) to anchor an edit. Dragging won’t open it.
		              </div>
		            </div>
		          ) : null}

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
                    try {
                      editor.setCurrentTool(toTldrawToolId(tool) as any);
                    } catch {
                      // ignore
                    }
	                  }}
	                  disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
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

		        {desktopChatOpen ? (
		        <aside className="hidden md:flex h-full w-[400px] border-l border-border/60 bg-card/90 backdrop-blur flex-col">
		          <div className="p-5 border-b border-border/60 space-y-3">
		            <div className="flex items-center gap-2 text-sm font-semibold">
		              <Bot className="size-4 text-muted-foreground" />
		              Pigcasso Agent
		            </div>
		            <div className="text-xs text-muted-foreground">
		              Create with prompts, then select something on the canvas to refine it.
		            </div>

			            <div className="flex flex-wrap gap-2">
			              {QUICK_PROMPTS.map((item) => (
			                <Button
			                  key={item.label}
		                  type="button"
		                  size="sm"
			                  variant="secondary"
			                  className="rounded-full"
			                  disabled={busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
			                  onClick={() => {
			                    chatInputRef.current = item.prompt;
			                    setChatInput(item.prompt);
			                  }}
		                >
		                  {item.label}
	                </Button>
	              ))}
		            </div>

		            <div className="pt-1 space-y-2">
		              <div className="text-xs font-semibold text-muted-foreground">Context</div>
		              <div className="flex flex-wrap gap-2">
		                {clickEditArmed ? (
		                  <button
		                    type="button"
		                    className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
		                    onClick={() => setClickEditArmed(false)}
		                  >
		                    <LocateFixed className="size-3 text-muted-foreground" />
		                    <span>Pin armed</span>
		                  </button>
		                ) : null}

		                {selectionContext ? (
		                  <button
		                    type="button"
		                    className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
		                    onClick={() => focusShapeId(selectionContext.shapeId)}
		                  >
		                    {selectionContext.previewUrl ? (
		                      // eslint-disable-next-line @next/next/no-img-element
		                      <img
		                        src={selectionContext.previewUrl}
		                        alt=""
		                        className="h-4 w-4 rounded-sm object-cover"
		                      />
		                    ) : null}
		                    <span className="max-w-[160px] truncate">{selectionContext.label}</span>
		                  </button>
		                ) : null}

		                {recentAttachments.map((att) => (
		                  <CanvasChatAttachmentChip
		                    key={att.id}
		                    attachment={att}
		                    onClick={() => focusShapeId(att.shapeId)}
		                  />
		                ))}

		                {!selectionContext && !recentAttachments.length && !clickEditArmed ? (
		                  <div className="text-xs text-muted-foreground">Select something to add context.</div>
		                ) : null}
		              </div>
		            </div>
		          </div>

		          <div className="flex-1 overflow-auto p-5 space-y-4">
		            <div className="space-y-4">
		              {messages.length ? (
	                <div className="space-y-3">
	                  {messages.map((msg) => (
	                    <div
	                      key={msg.id}
	                      className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
	                    >
	                      <div
	                        className={cn(
	                          "max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm",
	                          msg.role === "assistant" ? "bg-muted/40" : "bg-background",
	                        )}
		                      >
		                        <div className="text-xs font-semibold text-muted-foreground">
		                          {msg.role === "assistant" ? "Pigcasso" : "You"}
		                        </div>
		                        <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
		                        {msg.attachments?.length ? (
		                          <div className="mt-2 flex flex-wrap gap-2">
		                            {msg.attachments.map((att) => (
		                              <CanvasChatAttachmentChip
		                                key={att.id}
		                                attachment={att}
		                                onClick={() => focusShapeId(att.shapeId)}
		                              />
		                            ))}
		                          </div>
		                        ) : null}
		                      </div>
		                    </div>
		                  ))}

	                  {busy ? (
	                    <div className="flex justify-start">
	                      <div className="max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm bg-muted/40">
	                        <div className="text-xs font-semibold text-muted-foreground">Pigcasso</div>
	                        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
	                          <Loader2 className="size-4 animate-spin" />
	                          Thinking…
	                        </div>
	                      </div>
	                    </div>
	                  ) : null}

	                  <div ref={desktopChatEndRef} />
	                </div>
	              ) : (
	                <div className="space-y-3">
	                  <div className="text-sm text-muted-foreground">
	                    Describe what you want to create, then refine by selecting parts on the canvas.
	                  </div>
	                  <div className="text-xs text-muted-foreground">Try a quick prompt above, or type your own.</div>
	                  <div ref={desktopChatEndRef} />
	                </div>
	              )}
	            </div>
		          </div>
	
	          <div className="p-4 border-t border-border/60">
	            <div className="flex items-center gap-2">
	              <Button
	                type="button"
	                variant={clickEditArmed ? "secondary" : "ghost"}
	                size="icon"
	                className="rounded-full"
	                disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
	                aria-label={clickEditArmed ? "Cancel pin edit" : "Pin an edit to the canvas"}
	                aria-pressed={clickEditArmed}
	                onClick={() => {
	                  if (activeTool !== "select") {
	                    setActiveTool("select");
	                    try {
	                      editor?.setCurrentTool(toTldrawToolId("select") as any);
	                    } catch {
	                      // ignore
	                    }
	                  }
	                  setClickEditArmed((current) => !current);
	                }}
	              >
	                <LocateFixed className="size-4" />
	              </Button>

		              <div className="flex-1 rounded-full border bg-background px-4 py-2">
		                <Input
		                  value={chatInput}
		                  onChange={(e) => {
	                    chatInputRef.current = e.target.value;
	                    setChatInput(e.target.value);
	                  }}
	                  placeholder={
	                    boardCrashMessage
	                      ? "Board unavailable…"
	                      : !editor || !boardHydrated
	                        ? "Loading canvas…"
	                        : "Type a prompt… (try: “landing page for…”)"
	                  }
	                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
	                  disabled={busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
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
	                disabled={!chatInput.trim() || busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
	                aria-label="Send"
	              >
	                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
	                </Button>
	              </div>
	            </div>
	        </aside>
	        ) : null}
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
	                <Button type="button" variant="ghost" onClick={() => setMobileChatOpen(false)}>
	                  Close
	                </Button>
	              </div>
		            </div>
	
		            <div className="flex-1 overflow-auto p-4 space-y-4">
		              {selectionContext || recentAttachments.length || clickEditArmed ? (
		                <div className="space-y-2">
		                  <div className="text-xs font-semibold text-muted-foreground">Context</div>
		                  <div className="flex flex-wrap gap-2">
		                    {clickEditArmed ? (
		                      <button
		                        type="button"
		                        className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
		                        onClick={() => setClickEditArmed(false)}
		                      >
		                        <LocateFixed className="size-3 text-muted-foreground" />
		                        <span>Pin armed</span>
		                      </button>
		                    ) : null}

		                    {selectionContext ? (
		                      <button
		                        type="button"
		                        className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
		                        onClick={() => {
		                          focusShapeId(selectionContext.shapeId);
		                          setMobileChatOpen(false);
		                        }}
		                      >
		                        {selectionContext.previewUrl ? (
		                          // eslint-disable-next-line @next/next/no-img-element
		                          <img
		                            src={selectionContext.previewUrl}
		                            alt=""
		                            className="h-4 w-4 rounded-sm object-cover"
		                          />
		                        ) : null}
		                        <span className="max-w-[160px] truncate">{selectionContext.label}</span>
		                      </button>
		                    ) : null}

		                    {recentAttachments.map((att) => (
		                      <CanvasChatAttachmentChip
		                        key={att.id}
		                        attachment={att}
		                        onClick={() => {
		                          focusShapeId(att.shapeId);
		                          setMobileChatOpen(false);
		                        }}
		                      />
		                    ))}
		                  </div>
		                </div>
		              ) : null}

		              <div className="space-y-4">
		                {messages.length ? (
		                  <div className="space-y-3">
		                    {messages.map((msg) => (
	                      <div
	                        key={msg.id}
	                        className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
	                      >
	                        <div
	                          className={cn(
	                            "max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm",
	                            msg.role === "assistant" ? "bg-muted/40" : "bg-background",
	                          )}
	                        >
		                          <div className="text-xs font-semibold text-muted-foreground">
		                            {msg.role === "assistant" ? "Pigcasso" : "You"}
		                          </div>
		                          <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
		                          {msg.attachments?.length ? (
		                            <div className="mt-2 flex flex-wrap gap-2">
		                              {msg.attachments.map((att) => (
		                                <CanvasChatAttachmentChip
		                                  key={att.id}
		                                  attachment={att}
		                                  onClick={() => {
		                                    focusShapeId(att.shapeId);
		                                    setMobileChatOpen(false);
		                                  }}
		                                />
		                              ))}
		                            </div>
		                          ) : null}
		                        </div>
		                      </div>
		                    ))}

	                    {busy ? (
	                      <div className="flex justify-start">
	                        <div className="max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm bg-muted/40">
	                          <div className="text-xs font-semibold text-muted-foreground">Pigcasso</div>
	                          <div className="mt-1 flex items-center gap-2 text-muted-foreground">
	                            <Loader2 className="size-4 animate-spin" />
	                            Thinking…
	                          </div>
	                        </div>
	                      </div>
	                    ) : null}

	                    <div ref={mobileChatEndRef} />
	                  </div>
	                ) : (
	                  <div className="space-y-3">
	                    <div className="text-sm text-muted-foreground">
	                      Describe what you want to create, then refine by selecting parts on the canvas.
	                    </div>
		                    <div className="flex flex-wrap gap-2">
		                      {QUICK_PROMPTS.map((item) => (
		                        <Button
		                          key={item.label}
		                          type="button"
		                          size="sm"
		                          variant="secondary"
		                          className="rounded-full"
		                          disabled={busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
		                          onClick={() => {
		                            chatInputRef.current = item.prompt;
		                            setChatInput(item.prompt);
		                          }}
	                        >
	                          {item.label}
	                        </Button>
	                      ))}
	                    </div>
	                    <div ref={mobileChatEndRef} />
	                  </div>
	                )}
	              </div>
	            </div>
	
	            <div className="p-4 border-t border-border/60 pb-[calc(16px+env(safe-area-inset-bottom))]">
	              <div className="flex items-center gap-2">
	                <Button
	                  type="button"
	                  variant={clickEditArmed ? "secondary" : "ghost"}
	                  size="icon"
	                  className="rounded-full"
	                  disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
	                  aria-label={clickEditArmed ? "Cancel pin edit" : "Pin an edit to the canvas"}
	                  aria-pressed={clickEditArmed}
	                  onClick={() => {
	                    if (activeTool !== "select") {
	                      setActiveTool("select");
	                      try {
	                        editor?.setCurrentTool(toTldrawToolId("select") as any);
	                      } catch {
	                        // ignore
	                      }
	                    }
	
	                    if (!clickEditArmed) {
	                      toast.message("Tap on the canvas to pin an edit.", { duration: 2200 });
	                      setMobileChatOpen(false);
	                    }
	                    setClickEditArmed((current) => !current);
	                  }}
	                >
	                  <LocateFixed className="size-4" />
	                </Button>
	
		                <div className="flex-1 rounded-full border bg-background px-4 py-2">
		                  <Input
		                    value={chatInput}
	                    onChange={(e) => {
	                      chatInputRef.current = e.target.value;
	                      setChatInput(e.target.value);
	                    }}
	                    placeholder={
	                      boardCrashMessage
	                        ? "Board unavailable…"
	                        : !editor || !boardHydrated
	                          ? "Loading canvas…"
	                          : "Type a prompt…"
	                    }
	                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
	                    disabled={busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
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
	                  disabled={!chatInput.trim() || busy || !editor || !boardHydrated || Boolean(boardCrashMessage)}
	                  aria-label="Send"
	                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {debug ? (
        <div className="fixed bottom-4 left-4 z-[80] max-w-[calc(100vw-32px)] rounded-2xl border bg-card/90 backdrop-blur px-3 py-2 text-[11px] shadow-soft space-y-1">
          <div className="font-semibold">Canvas debug</div>
          <div className="text-muted-foreground">
            editor: {editor ? "yes" : "no"} • hydrated: {boardHydrated ? "yes" : "no"} • remounting:{" "}
            {remountingRef.current ? "yes" : "no"}
          </div>
          <div className="text-muted-foreground">
            mounts: {mountCountRef.current} • unmounts: {unmountCountRef.current} • mountKey:{" "}
            {tldrawMountKey}
          </div>
          <div className="text-muted-foreground">
            last mount:{" "}
            {lastMountAtRef.current ? new Date(lastMountAtRef.current).toLocaleTimeString() : "—"} • last unmount:{" "}
            {lastUnmountAtRef.current ? new Date(lastUnmountAtRef.current).toLocaleTimeString() : "—"}
          </div>
          <div className="text-muted-foreground">auto-recover attempts: {autoRecoverAttemptsRef.current}</div>
          {boardCrashMessage ? (
            <div className="mt-1 rounded-xl border bg-background/70 p-2 whitespace-pre-wrap break-words">
              {boardCrashMessage}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
