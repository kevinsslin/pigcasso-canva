"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  Bot,
  ChevronLeft,
  Loader2,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { createShapeId } from "@tldraw/tlschema";
import { loadSnapshot, type Editor as TldrawEditor, useTldrawUser } from "tldraw";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { UserButton } from "@/features/auth/components/user-button";
import {
  NANO_BANANA_PROFILE_STORAGE_KEY,
  parseNanoBananaProfileOption,
  type NanoBananaProfileOption,
} from "@/features/ai/lib/nano-banana-profile";
import { useChatAssistant } from "@/features/ai/api/use-chat-assistant";
import { useAnalyzeCanvasPrompt } from "@/features/ai/api/use-analyze-canvas-prompt";
import { useGenerateImage } from "@/features/ai/api/use-generate-image";
import { useEditImage } from "@/features/ai/api/use-edit-image";
import { useGenerateHtml } from "@/features/ai/api/use-generate-html";
import { useExtractText } from "@/features/ai/api/use-extract-text";
import { useRemoveBg } from "@/features/ai/api/use-remove-bg";
import { useGetCanvas } from "@/features/canvases/api/use-get-canvas";
import { useUpsertCanvas } from "@/features/canvases/api/use-upsert-canvas";
import { useUpdateCanvas } from "@/features/canvases/api/use-update-canvas";
import { createHtmlCardSrcDoc, HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import { HtmlCardShapeUtil } from "@/features/canvases/tldraw/html-card-shape";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { handleCanvasDeleteShortcut, isEditableKeyboardTarget } from "@/features/canvases/tldraw/delete-shortcut";
import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";
import { findFirstImageShapeIdInGroup } from "@/features/canvases/tldraw/find-image-in-group";
import { exportCurrentCanvasPageToPngDataUrl } from "@/features/canvases/tldraw/export-canvas-image";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { PigcassoTextShapeUtil } from "@/features/canvases/tldraw/pigcasso-text-shape-util";
import { sanitizeTldrawStoreSnapshot } from "@/features/canvases/tldraw/sanitize-snapshot";
import { getTabAnchor } from "@/features/canvases/tldraw/tab-anchor";
import {
  handleCanvasKeyboardShortcuts,
  type CanvasClipboardRef,
} from "@/features/canvases/tldraw/keyboard-shortcuts";
import {
  createAiJobMutex,
  createAiJobQueue,
  type AiJobQueue,
  type AiJobQueueCounts,
  type AiJobMutex,
} from "@/features/canvases/lib/ai-job-queue";
import { getApiErrorStatus } from "@/lib/api-error";
import { copyTextToClipboard } from "@/lib/clipboard";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

import { CanvasToolRail } from "@/features/canvases/components/canvas-tool-rail";
import { EditableBoardTitle } from "@/features/canvases/components/editable-board-title";
import { useBoardDisconnectGuard } from "@/features/canvases/hooks/use-board-disconnect-guard";
import { CANVAS_TOOL_BUTTONS, toTldrawToolId, type CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { getCanvasChatSuggestions } from "@/features/canvases/lib/chat-suggestions";
import { toCanvasImageUrl, unwrapCanvasImageProxyUrl } from "@/features/canvases/lib/image-proxy";
import {
  clampCanvasTextScale,
  getCanvasTextSizePx,
  pickCanvasTextSizeAndScaleFromPx,
  PIGCASSO_TEXT_FONT_FAMILY_META_KEY,
  toRichTextValue,
  type CanvasTextSize,
} from "@/features/canvases/lib/text-style";
import { applyAtMentionReplacement } from "@/features/canvases/lib/at-mentions";
import { getPinEditTrigger, isClickWithinThreshold, type PinEditTrigger } from "@/features/canvases/lib/pin-edit";
import { getSelectionContext, type SelectionContext } from "@/features/canvases/lib/selection-context";
import { CanvasShareButton } from "@/features/canvases/components/canvas-share-button";
import { CanvasPublishButton } from "@/features/canvases/components/canvas-publish-button";
import { CanvasChatPanel } from "@/features/canvases/screens/canvas-screen/canvas-chat-panel";
import { CanvasDebugPanel } from "@/features/canvases/screens/canvas-screen/canvas-debug-panel";
import { CanvasDownloadsDialog } from "@/features/canvases/screens/canvas-screen/canvas-downloads-dialog";
import {
  CanvasExportNftDialog,
  type CanvasExportNftTarget,
} from "@/features/canvases/screens/canvas-screen/canvas-export-nft-dialog";
import {
  CanvasPrintrLaunchDialog,
  type CanvasPrintrLaunchTarget,
} from "@/features/canvases/screens/canvas-screen/canvas-printr-launch-dialog";
import { CanvasHtmlCodeDialog } from "@/features/canvases/screens/canvas-screen/canvas-html-code-dialog";
import { CanvasMentionPicker } from "@/features/canvases/screens/canvas-screen/canvas-mention-picker";
import { CanvasMobileDock } from "@/features/canvases/screens/canvas-screen/canvas-mobile-dock";
import { CanvasSelectionToolbar, type CanvasSelectionToolbarAnchor } from "@/features/canvases/screens/canvas-screen/canvas-selection-toolbar";
import { useAiUiJob } from "@/features/canvases/screens/canvas-screen/hooks/use-ai-ui-job";
import { useCanvasChatStorage } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-chat-storage";
import { useCanvasEditorSync } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-editor-sync";
import { useCanvasHtmlPreviews } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-html-previews";
import { useCanvasMentions } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-mentions";
import { useCanvasSelectedImageActions } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-selected-image-actions";
import { useCanvasSendMessage } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-send-message";
import { useCanvasSnapshotPersistence } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-snapshot-persistence";
import { useCanvasUploads } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-uploads";
import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

const getExtensionForMime = (mime: string | null) => {
  const type = (mime ?? "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  return null;
};

export default function CanvasScreen({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, authenticated } = useRequireAuth(`/canvas/${params.canvasId}`);
  const debug = searchParams?.get("debug") === "1";
  const tldrawLicenseKey = (process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ?? "").trim();
  const isProdBuild = process.env.NODE_ENV === "production";
  const tldrawLicenseMissing = isProdBuild && !tldrawLicenseKey;

  const [editor, setEditor] = useState<TldrawEditor | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [desktopChatOpen, setDesktopChatOpen] = useState(true);
  const [clickEditArmed, setClickEditArmed] = useState(false);
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [selectionToolbarAnchor, setSelectionToolbarAnchor] = useState<CanvasSelectionToolbarAnchor | null>(null);
  const [selectedTextStyleKey, setSelectedTextStyleKey] = useState("");
  const [htmlCodeDialogOpen, setHtmlCodeDialogOpen] = useState(false);
  const [htmlCodeDialogHtml, setHtmlCodeDialogHtml] = useState("");
  const [htmlCodeDialogFilename, setHtmlCodeDialogFilename] = useState("HTML");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<CanvasChatMessage[]>([]);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [canvasName, setCanvasName] = useState("Untitled");
  const [aiJobCounts, setAiJobCounts] = useState<AiJobQueueCounts>({ active: 0, queued: 0 });
  const busy = aiJobCounts.active > 0;
  const [aiProfile, setAiProfile] = useState<NanoBananaProfileOption>(() => {
    const fromQuery = parseNanoBananaProfileOption(searchParams?.get("profile"));
    return fromQuery ?? "auto";
  });
  const { aiUiJob, startAiUiJob, updateAiUiJobLabel, finishAiUiJob } = useAiUiJob();
  const [boardHydrated, setBoardHydrated] = useState(false);
  const [boardCrashMessage, setBoardCrashMessage] = useState<string | null>(null);
  const [tldrawMountKey, setTldrawMountKey] = useState(0);
  const { handleUploadFiles } = useCanvasUploads({ editor, boardHydrated, boardCrashMessage });

  const chatInputRef = useRef(chatInput);
  const chatCursorIndexRef = useRef<number | null>(null);
  const desktopChatInputElRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileChatInputElRef = useRef<HTMLTextAreaElement | null>(null);
  const outputCounterRef = useRef(1);
  const desktopChatEndRef = useRef<HTMLDivElement | null>(null);
  const mobileChatEndRef = useRef<HTMLDivElement | null>(null);
  const canvasClipboardRef = useRef<unknown | null>(null) as CanvasClipboardRef;
  const heldPanToolRef = useRef<CanvasTool | null>(null);
  const aiJobQueueRef = useRef<AiJobQueue | null>(null);
  const aiCommitMutexRef = useRef<AiJobMutex | null>(null);

  const lastSelectionToolbarKeyRef = useRef<string>("");
  const lastSelectedTextStyleKeyRef = useRef<string>("");

  if (!aiJobQueueRef.current) {
    aiJobQueueRef.current = createAiJobQueue({ concurrency: 3, onChange: setAiJobCounts });
  }

  if (!aiCommitMutexRef.current) {
    aiCommitMutexRef.current = createAiJobMutex();
  }

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
  const shapeUtils = useMemo(() => [PigcassoTextShapeUtil, HtmlCardShapeUtil], []);
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

  const chatAssistant = useChatAssistant();
  const analyzeCanvasPrompt = useAnalyzeCanvasPrompt();
  const generateImage = useGenerateImage();
  const editImage = useEditImage();
  const generateHtml = useGenerateHtml();
  const extractText = useExtractText();
  const removeBg = useRemoveBg();

  const canvasQuery = useGetCanvas(params.canvasId, { enabled: ready && authenticated });
  const upsertCanvas = useUpsertCanvas({ toast: false });
  const updateCanvas = useUpdateCanvas({ toast: false, invalidate: false, invalidateList: false });
  const renameCanvas = useUpdateCanvas({ toast: false, invalidate: false });

  useCanvasChatStorage({
    canvasId: params.canvasId,
    ready,
    authenticated,
    boardCrashMessage,
    messages,
    setMessages,
    canvasQuery,
    updateCanvas,
  });

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
  const lastSavedCoverSnapshotRef = useRef<string | null>(null);
  const coverGenerationInFlightRef = useRef(false);
  const coverGenerationRerunRequestedRef = useRef(false);
  const pendingCoverSnapshotRef = useRef<string | null>(null);
  const hasProxiedImageAssetsRef = useRef(false);
  const hasUserEditedRef = useRef(false);
  const hasShownRemoteSyncSkippedToastRef = useRef(false);
  const tabPointerDownRef = useRef<{ x: number; y: number; trigger: PinEditTrigger } | null>(null);
  const lastKnownToolIdRef = useRef<CanvasTool | null>(null);
  const lastZoomPercentRef = useRef<number | null>(null);
  const lastSelectionShapeIdRef = useRef<string | null>(null);
  const lastSelectedShapeIdsKeyRef = useRef<string>("");
  const [tabAnchor, setTabAnchor] = useState<{
    screenX: number;
    screenY: number;
    pagePoint: { x: number; y: number };
    shapeId: string | null;
  } | null>(null);
  const [tabInstruction, setTabInstruction] = useState("");
  const [pinnedShapeIds, setPinnedShapeIds] = useState<string[]>([]);
  const {
    mentionPicker,
    openMentionPicker,
    closeMentionPicker,
    activeAtMention,
    filteredMentionShapes,
    pickMention,
    onDesktopMentionButtonClick,
    onMobileMentionButtonClick,
  } = useCanvasMentions({
    editor,
    chatInput,
    chatInputRef,
    chatCursorIndexRef,
    setChatInput,
    setPinnedShapeIds,
    desktopChatInputElRef,
    mobileChatInputElRef,
  });
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [exportNftOpen, setExportNftOpen] = useState(false);
  const [exportNftTarget, setExportNftTarget] = useState<CanvasExportNftTarget | null>(null);
  const [printrOpen, setPrintrOpen] = useState(false);
  const [printrTarget, setPrintrTarget] = useState<CanvasPrintrLaunchTarget | null>(null);

  useEffect(() => {
    if (activeTool === "select") return;
    tabPointerDownRef.current = null;
    setTabAnchor(null);
    setClickEditArmed(false);
  }, [activeTool]);

  useEffect(() => {
    chatInputRef.current = chatInput;
  }, [chatInput]);

  const openPinnedEditPopover = useCallback((anchor: { screenPoint: { x: number; y: number }; pagePoint: { x: number; y: number }; shapeId: string | null }) => {
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
  }, []);

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

  const applyTool = useCallback(
    (tool: CanvasTool) => {
      setActiveTool(tool);
      if (!editor) return;
      try {
        editor.setCurrentTool(toTldrawToolId(tool) as any);
      } catch {
        // ignore
      }
    },
    [editor],
  );

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

    const fromQuery = parseNanoBananaProfileOption(searchParams?.get("profile"));
    const stored = parseNanoBananaProfileOption(window.localStorage.getItem(NANO_BANANA_PROFILE_STORAGE_KEY));

    const next = fromQuery ?? stored ?? null;
    if (!next) return;

    if (next !== aiProfile) {
      setAiProfile(next);
    }
    try {
      window.localStorage.setItem(NANO_BANANA_PROFILE_STORAGE_KEY, next);
    } catch {
      // ignore
    }

    if (fromQuery) {
      removeSearchParamsFromUrl(["profile"]);
    }
  }, [aiProfile, removeSearchParamsFromUrl, searchParams]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(document.activeElement)) return;
      const handledDelete = handleCanvasDeleteShortcut(editor as any, event);
      const handledShortcut = handleCanvasKeyboardShortcuts(editor as any, event, {
        clipboardRef: canvasClipboardRef,
        onToolChange: applyTool,
      });

      if (handledDelete || handledShortcut) return;
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [applyTool, boardCrashMessage, boardHydrated, canvasClipboardRef, editor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!editor) return;
    if (!boardHydrated) return;
    if (boardCrashMessage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== " " && event.code !== "Space") return;
      try {
        if ((editor as any).getEditingShapeId?.()) return;
      } catch {
        // ignore
      }
      if (isEditableKeyboardTarget(document.activeElement ?? event.target)) return;
      if (activeTool === "hand") return;
      if (heldPanToolRef.current) return;

      event.preventDefault();
      heldPanToolRef.current = activeTool;
      applyTool("hand");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== " " && event.code !== "Space") return;
      if (!heldPanToolRef.current) return;

      event.preventDefault();
      const previous = heldPanToolRef.current;
      heldPanToolRef.current = null;
      applyTool(previous);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      heldPanToolRef.current = null;
    };
  }, [activeTool, applyTool, boardCrashMessage, boardHydrated, editor]);

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
    enabled: ready && authenticated && !tldrawLicenseMissing,
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
        loadSnapshot(editor.store, sanitizeTldrawStoreSnapshot(snapshot) as any);
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

  useCanvasEditorSync({
    editor,
    setActiveTool,
    setZoomPercent,
    setSelectedShapeIds,
    setSelectedTextStyleKey,
    setSelectionContext,
    setSelectionToolbarAnchor,
    lastKnownToolIdRef,
    lastZoomPercentRef,
    lastSelectedShapeIdsKeyRef,
    lastSelectedTextStyleKeyRef,
    lastSelectionShapeIdRef,
    lastSelectionToolbarKeyRef,
  });

  const { ensureHtmlCardPreview } = useCanvasHtmlPreviews({
    editor,
    boardHydrated,
    boardCrashMessage,
  });

  useCanvasSnapshotPersistence({
    canvasId: params.canvasId,
    editor,
    boardHydrated,
    boardCrashMessage,
    canvasQuery,
    localSnapshotKey,
    updateCanvas,
    hydratingRef,
    lastSavedSnapshotRef,
    lastSavedCoverSnapshotRef,
    pendingCoverSnapshotRef,
    coverGenerationInFlightRef,
    coverGenerationRerunRequestedRef,
  });

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
          await insertImageToCanvas(editor as any, {
            src: boardImageUrl,
            point,
            name: `IMG_${Date.now()}.png`,
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
        removeSearchParamsFromUrl(["image"]);
      }
    };

    void insert();
  }, [boardCrashMessage, boardHydrated, editor, removeSearchParamsFromUrl, searchParams]);

  const withAiCommit = useCallback(<T,>(fn: () => Promise<T> | T) => {
    const mutex = aiCommitMutexRef.current;
    if (!mutex) return Promise.resolve().then(fn);
    return mutex.runExclusive(fn);
  }, []);

  const sendMessage = useCanvasSendMessage({
    editor,
    boardHydrated,
    boardCrashMessage,
    aiProfile,
    aiJobQueueRef,
    chatInputRef,
    setChatInput,
    setMessages,
    outputCounterRef,
    startAiUiJob,
    updateAiUiJobLabel,
    finishAiUiJob,
    withAiCommit,
    chatAssistant,
    analyzeCanvasPrompt,
    generateImage,
    editImage,
    generateHtml,
    ensureHtmlCardPreview,
  });

  const pinnedContexts = useMemo(() => {
    if (!editor) return [];
    const list = pinnedShapeIds
      .map((shapeId) => getSelectionContext(editor as any, shapeId))
      .filter(Boolean) as SelectionContext[];
    return list;
  }, [editor, pinnedShapeIds]);

  const selectedTextShape = useMemo(() => {
    void selectedTextStyleKey;
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== "text") return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds, selectedTextStyleKey]);

  const selectedImageShape = useMemo(() => {
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== "image") return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds]);

  const selectedHtmlShape = useMemo(() => {
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== HTML_CARD_SHAPE_TYPE) return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds]);

  const selectedGroupShape = useMemo(() => {
    if (!editor) return null;
    if (selectedShapeIds.length !== 1) return null;
    try {
      const shape = editor.getShape(selectedShapeIds[0] as any) as any;
      if (!shape || typeof shape !== "object" || shape.type !== "group") return null;
      return shape as any;
    } catch {
      return null;
    }
  }, [editor, selectedShapeIds]);

  const selectedImageAsset = useMemo(() => {
    if (!editor) return null;
    const assetId = (selectedImageShape as any)?.props?.assetId;
    if (!assetId) return null;
    try {
      return (editor.getAsset?.(assetId) as any) ?? null;
    } catch {
      return null;
    }
  }, [editor, selectedImageShape]);

  const selectedImageAiSrc = useMemo(() => {
    const metaSrcRaw = (selectedImageAsset as any)?.meta?.originalSrc ?? (selectedImageAsset as any)?.meta?.rawSrc;
    if (typeof metaSrcRaw === "string" && metaSrcRaw.trim()) {
      return unwrapCanvasImageProxyUrl(metaSrcRaw.trim());
    }

    const src = (selectedImageAsset as any)?.props?.src;
    if (typeof src !== "string" || !src.trim()) return null;
    return unwrapCanvasImageProxyUrl(src.trim());
  }, [selectedImageAsset]);

  const { regenerateSelectedImage, removeBackgroundFromSelectedImage, makeSelectedImageTextEditable } =
    useCanvasSelectedImageActions({
      editor,
      boardHydrated,
      boardCrashMessage,
      aiProfile,
      aiJobQueueRef,
      startAiUiJob,
      finishAiUiJob,
      withAiCommit,
      selectedImageShape,
      selectedImageAsset,
      selectedImageAiSrc,
      editImage,
      removeBg,
      extractText,
      outputCounterRef,
      setMessages,
    });

  const selectedTextStyle = useMemo(() => {
    void selectedTextStyleKey;
    const props = (selectedTextShape as any)?.props ?? {};
    const font = typeof props.font === "string" ? props.font : "draw";
    const rawSize = typeof props.size === "string" ? props.size : "m";
    const size: CanvasTextSize = rawSize === "s" || rawSize === "m" || rawSize === "l" || rawSize === "xl" ? rawSize : "m";
    const color = typeof props.color === "string" ? props.color : "black";
    const scale = clampCanvasTextScale(Number(props.scale ?? 1) || 1);
    const sizePx = getCanvasTextSizePx(size, scale);
    const metaFontFamily = (selectedTextShape as any)?.meta?.[PIGCASSO_TEXT_FONT_FAMILY_META_KEY];
    const fontFamily = typeof metaFontFamily === "string" && metaFontFamily.trim() ? metaFontFamily.trim() : null;
    return { font, size, color, sizePx, fontFamily };
  }, [selectedTextShape, selectedTextStyleKey]);

  const selectionToolbarSuppressed = downloadsOpen || exportNftOpen || printrOpen || htmlCodeDialogOpen;

  const resolvedSelectionToolbarAnchor = useMemo(() => {
    if (selectionToolbarSuppressed) return null;
    if (!selectionToolbarAnchor) return null;
    if (selectedShapeIds.length !== 1) return null;
    if (selectionToolbarAnchor.shapeId !== selectedShapeIds[0]) return null;
    if (selectionToolbarAnchor.kind === "image" && !selectedImageShape) return null;
    if (selectionToolbarAnchor.kind === "html" && !selectedHtmlShape) return null;
    if (selectionToolbarAnchor.kind === "text" && !selectedTextShape) return null;
    if (selectionToolbarAnchor.kind === "group" && !selectedGroupShape) return null;
    return selectionToolbarAnchor;
  }, [
    selectionToolbarSuppressed,
    selectedGroupShape,
    selectedHtmlShape,
    selectedImageShape,
    selectedShapeIds,
    selectedTextShape,
    selectionToolbarAnchor,
  ]);

  const updateSelectedTextStyle = useCallback(
    (
      partial: Partial<{ font: string; size: string; color: string; sizePx: number; fontFamily: string | null }>,
    ) => {
      if (!editor) return;
      if (!selectedTextShape) return;
      try {
        const currentShape = editor.getShape?.(selectedTextShape.id as any) as any;
        if (!currentShape || typeof currentShape !== "object") return;

        const currentMeta = ((currentShape as any)?.meta ?? {}) as Record<string, unknown>;
        const nextMeta = { ...currentMeta };
        let metaTouched = false;

        const nextProps: Record<string, unknown> = {};
        const fontFamilyTouched = Object.prototype.hasOwnProperty.call(partial, "fontFamily");

        if (fontFamilyTouched) {
          metaTouched = true;
          const raw = partial.fontFamily;
          if (typeof raw === "string" && raw.trim()) {
            nextMeta[PIGCASSO_TEXT_FONT_FAMILY_META_KEY] = raw.trim();
            if (partial.font === undefined) {
              nextProps.font = "sans";
            }
          } else {
            delete nextMeta[PIGCASSO_TEXT_FONT_FAMILY_META_KEY];
          }
        }

        if (typeof partial.font === "string" && partial.font.trim()) {
          nextProps.font = partial.font;
          if (!fontFamilyTouched && PIGCASSO_TEXT_FONT_FAMILY_META_KEY in nextMeta) {
            metaTouched = true;
            delete nextMeta[PIGCASSO_TEXT_FONT_FAMILY_META_KEY];
          }
        }

        if (typeof partial.color === "string" && partial.color.trim()) {
          nextProps.color = partial.color;
        }

        if (typeof partial.sizePx === "number") {
          const { size, scale } = pickCanvasTextSizeAndScaleFromPx(partial.sizePx);
          nextProps.size = size;
          nextProps.scale = scale;
        } else if (typeof partial.size === "string" && partial.size.trim()) {
          nextProps.size = partial.size;
          nextProps.scale = 1;
        }

        editor.updateShape?.({
          id: selectedTextShape.id as any,
          type: "text",
          ...(Object.keys(nextProps).length ? { props: nextProps } : null),
          ...(metaTouched ? { meta: nextMeta } : null),
        } as any);
      } catch {
        // ignore
      }
    },
    [editor, selectedTextShape],
  );

  const openChatPanel = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(min-width: 768px)")?.matches) {
      setDesktopChatOpen(true);
    } else {
      setMobileChatOpen(true);
    }
  }, []);

  const focusChatInput = useCallback(
    (prefill?: string) => {
      if (prefill !== undefined) {
        chatInputRef.current = prefill;
        setChatInput(prefill);
      }

      if (typeof window === "undefined") return;
      openChatPanel();

      window.setTimeout(() => {
        const isDesktop = window.matchMedia?.("(min-width: 768px)")?.matches;
        const el = isDesktop ? desktopChatInputElRef.current : mobileChatInputElRef.current;
        try {
          el?.focus();
        } catch {
          // ignore
        }
      }, 50);
    },
    [openChatPanel],
  );

  const addSelectionToChat = useCallback(
    (options?: { prefill?: string }) => {
      const ctx = selectionContext;
      if (!ctx) return;

      setPinnedShapeIds((current) => (current.includes(ctx.shapeId) ? current : [...current, ctx.shapeId]));

      const mention = applyAtMentionReplacement(chatInputRef.current || "", ctx.label);
      const nextValue = options?.prefill ? `${mention}${options.prefill}` : mention;
      focusChatInput(nextValue);
    },
    [focusChatInput, selectionContext],
  );

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    if (typeof window === "undefined") return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  const downloadSelectedImage = useCallback(async () => {
    const asset = selectedImageAsset as any;
    if (!asset) {
      toast.error("Select an image to download.");
      return;
    }

    const url =
      (typeof asset?.props?.src === "string" && asset.props.src.trim()) ||
      (typeof asset?.meta?.rawSrc === "string" && toCanvasImageUrl(asset.meta.rawSrc)) ||
      (typeof asset?.meta?.originalSrc === "string" && toCanvasImageUrl(asset.meta.originalSrc)) ||
      null;

    if (!url) {
      toast.error("Selected image is missing a URL.");
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to download image.");
      }

      const blob = await response.blob();
      const ext = getExtensionForMime(blob.type) ?? "png";

      const rawName = typeof asset?.props?.name === "string" ? asset.props.name.trim() : "";
      const baseName = rawName || `IMG_${Date.now()}`;
      const filename = /\.[a-z0-9]+$/i.test(baseName) ? baseName : `${baseName}.${ext}`;

      downloadBlob(blob, filename);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download image.";
      toast.error(message, { duration: 3500 });
    }
  }, [downloadBlob, selectedImageAsset]);

  const openExportNftForShapeId = useCallback(
    async (shapeId: string) => {
      if (!editor) {
        toast.error("Canvas is still loading. Try again in a moment.");
        return;
      }

      const shape = (() => {
        try {
          return editor.getShape?.(shapeId as any) as any;
        } catch {
          return null;
        }
      })();

      if (!shape || typeof shape !== "object" || shape.type !== "image" || !shape.props?.assetId) {
        toast.error("Select an image to mint.");
        return;
      }

      const asset = (() => {
        try {
          return editor.getAsset?.(shape.props.assetId as any) as any;
        } catch {
          return null;
        }
      })();

      if (!asset) {
        toast.error("Select an image to mint.");
        return;
      }

      const previewSrc = typeof asset?.props?.src === "string" ? asset.props.src.trim() : "";
      const originalSrc = typeof asset?.meta?.originalSrc === "string" ? asset.meta.originalSrc.trim() : "";
      const rawSrc = typeof asset?.meta?.rawSrc === "string" ? asset.meta.rawSrc.trim() : "";
      const propsSrc = typeof asset?.props?.src === "string" ? asset.props.src.trim() : "";
      const unwrapped = propsSrc ? unwrapCanvasImageProxyUrl(propsSrc) : "";

      const imageUrl = originalSrc || rawSrc || unwrapped || "";

      const rawName = typeof asset?.props?.name === "string" ? asset.props.name.trim() : "";
      const fallbackPreviewUrl = previewSrc || (imageUrl ? toCanvasImageUrl(imageUrl) : "");
      const contextLabel = getSelectionContext(editor as any, shapeId)?.label ?? null;

      const toastId = toast.loading("Preparing PNG…");

      const compositeUrl = await (async () => {
        if (!boardHydrated) return null;
        if (boardCrashMessage) return null;

        try {
          const dataUrl = await exportCurrentCanvasPageToPngDataUrl(editor as any, {
            targetPx: 2048,
            padding: 32,
            pixelRatio: 2,
          });

          return await uploadImageDataUrl(
            dataUrl,
            `pigcasso_canvas_${params.canvasId}_${Date.now()}.png`,
          );
        } catch {
          return null;
        }
      })();

      if (!compositeUrl) {
        toast.error("Couldn’t export a combined PNG. Please try again.", {
          id: toastId,
          duration: 3500,
        });
        return;
      }

      toast.success("PNG ready.", { id: toastId, duration: 1200 });

      const exportImageUrl = compositeUrl;
      const previewUrl = compositeUrl || fallbackPreviewUrl || imageUrl;

      setExportNftTarget({
        canvasId: params.canvasId,
        canvasName,
        shapeId,
        imageUrl: exportImageUrl,
        previewUrl,
        defaultName: rawName || contextLabel || canvasName,
      });
      setExportNftOpen(true);
    },
    [boardCrashMessage, boardHydrated, canvasName, editor, params.canvasId],
  );

  const selectedGroupMintImageShapeId = useMemo(() => {
    if (!editor) return null;
    if (!selectedGroupShape) return null;
    return findFirstImageShapeIdInGroup(editor as any, String((selectedGroupShape as any).id));
  }, [editor, selectedGroupShape]);

  const mintSelectionAsNft = useCallback(() => {
    const shapeId = selectedImageShape
      ? String((selectedImageShape as any).id)
      : selectedGroupMintImageShapeId;
    if (!shapeId) {
      toast.error("Select an image to mint.");
      return;
    }

    void openExportNftForShapeId(shapeId);
  }, [openExportNftForShapeId, selectedGroupMintImageShapeId, selectedImageShape]);

  const openPrintrLaunchForShapeId = useCallback(
    async (shapeId: string) => {
      if (!editor) {
        toast.error("Canvas is still loading. Try again in a moment.");
        return;
      }
      if (!boardHydrated || boardCrashMessage) {
        toast.error("Canvas is still loading. Try again in a moment.");
        return;
      }

      const shape = (() => {
        try {
          return editor.getShape?.(shapeId as any) as any;
        } catch {
          return null;
        }
      })();

      if (!shape || typeof shape !== "object" || shape.type !== "image") {
        toast.error("Select an image to launch.");
        return;
      }

      const contextLabel = getSelectionContext(editor as any, shapeId)?.label ?? null;
      const toastId = toast.loading("Preparing token image…");

      try {
        const dataUrl = await exportCurrentCanvasPageToPngDataUrl(editor as any, {
          targetPx: 1536,
          padding: 32,
          pixelRatio: 1,
        });

        setPrintrTarget({
          canvasId: params.canvasId,
          canvasName,
          shapeId,
          imageDataUrl: dataUrl,
          defaultName: contextLabel || canvasName,
        });
        setPrintrOpen(true);
        toast.success("Ready to launch.", { id: toastId, duration: 1200 });
      } catch {
        toast.error("Couldn’t prepare the token image. Please try again.", {
          id: toastId,
          duration: 3500,
        });
      }
    },
    [boardCrashMessage, boardHydrated, canvasName, editor, params.canvasId],
  );

  const launchSelectionOnPrintr = useCallback(() => {
    const shapeId = selectedImageShape
      ? String((selectedImageShape as any).id)
      : selectedGroupMintImageShapeId;
    if (!shapeId) {
      toast.error("Select an image to launch.");
      return;
    }
    void openPrintrLaunchForShapeId(shapeId);
  }, [openPrintrLaunchForShapeId, selectedGroupMintImageShapeId, selectedImageShape]);

  const viewSelectedHtmlCode = useCallback(() => {
    const shape = selectedHtmlShape as any;
    const html = typeof shape?.props?.html === "string" ? shape.props.html : "";
    if (!html.trim()) {
      toast.error("Select an HTML card to view its code.");
      return;
    }

    setHtmlCodeDialogHtml(html);
    setHtmlCodeDialogFilename(`HTML_${Date.now()}`);
    setHtmlCodeDialogOpen(true);
  }, [selectedHtmlShape]);

  const downloadSelectedHtml = useCallback(() => {
    const shape = selectedHtmlShape as any;
    const html = typeof shape?.props?.html === "string" ? shape.props.html : "";
    if (!html.trim()) {
      toast.error("Select an HTML card to download.");
      return;
    }

    const srcDoc = createHtmlCardSrcDoc(html);
    const blob = new Blob([srcDoc], { type: "text/html;charset=utf-8" });
    downloadBlob(blob, `pigcasso_html_${Date.now()}.html`);
  }, [downloadBlob, selectedHtmlShape]);

  const ungroupSelectedShapes = useCallback(() => {
    if (!editor || !boardHydrated || boardCrashMessage) return;
    const selected = (editor.getSelectedShapeIds?.() ?? []).map((id) => String(id));
    if (selected.length !== 1) return;

    const shape = (() => {
      try {
        return editor.getShape?.(selected[0] as any) as any;
      } catch {
        return null;
      }
    })();

    if (!shape || typeof shape !== "object" || shape.type !== "group") return;

    try {
      void withHistorySquash(editor as any, "ungroup", async () => {
        editor.ungroupShapes?.(selected as any);
      });
    } catch {
      toast.error("Couldn’t ungroup that selection.", { duration: 2500 });
    }
  }, [boardCrashMessage, boardHydrated, editor]);

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

  const allAttachments = useMemo(() => {
    const list: CanvasChatAttachment[] = [];
    messages.forEach((msg) => {
      (msg.attachments ?? []).forEach((att) => list.push(att));
    });
    return list;
  }, [messages]);

  const chatSuggestions = useMemo(
    () => getCanvasChatSuggestions({ messages: messages as any, selectionContext }),
    [messages, selectionContext],
  );

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
    <div className="pigcasso-paper-theme h-[100dvh] w-[100dvw] overflow-hidden bg-background">
          <main className="h-full w-full overflow-hidden flex">
            <CanvasToolRail
              activeTool={activeTool}
              disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
              onToolChange={applyTool}
            />
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute left-4 top-4 z-40 flex items-center gap-3">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
                  aria-label="Back to app"
                >
                  <span className="inline-flex items-center justify-center rounded-full border bg-card/80 backdrop-blur h-9 w-9 md:hidden">
                    <ChevronLeft className="size-4" />
                  </span>
                  <span className="hidden md:inline-flex size-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 items-center justify-center overflow-hidden shadow-lg shadow-pink-500/20">
                    <Image src="/logo-pig.png" alt="Pigcasso" width={36} height={36} className="h-full w-full object-cover" />
                  </span>
                </Link>

                <EditableBoardTitle name={canvasName} onRename={handleRenameBoard} />
              </div>

              <div className="absolute left-1/2 top-4 z-40 hidden -translate-x-1/2 md:flex items-center gap-1 rounded-full border bg-card/80 backdrop-blur px-2 py-1 shadow-soft">
                <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground tabular-nums">
                  {editor ? `${zoomPercent}%` : "—"}
                </span>
              </div>

              {typeof document === "undefined" || selectionToolbarSuppressed
                ? null
                : createPortal(
                    <CanvasSelectionToolbar
	                      anchor={resolvedSelectionToolbarAnchor}
	                      disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
	                      onAddToChat={() => addSelectionToChat()}
	                      onDownloadSelected={() => void downloadSelectedImage()}
	                      onDownloadSelectedHtml={() => downloadSelectedHtml()}
                        onMintNft={() => mintSelectionAsNft()}
                        onLaunchPrintr={() => launchSelectionOnPrintr()}
                        showMintNft={Boolean(selectedGroupMintImageShapeId) || Boolean(selectedImageShape)}
	                      onRegenerate={() => void regenerateSelectedImage()}
	                      onRemoveBackground={() => void removeBackgroundFromSelectedImage()}
                      onMakeTextEditable={() => void makeSelectedImageTextEditable()}
                      onViewHtmlCode={() => viewSelectedHtmlCode()}
                      onUngroup={() => void ungroupSelectedShapes()}
                      textStyle={selectedTextShape ? selectedTextStyle : null}
                      onUpdateTextStyle={updateSelectedTextStyle}
                    />,
                    document.body,
                  )}

              <div className="absolute right-4 top-4 z-40 flex items-center gap-1">
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

                <CanvasPublishButton
                  canvasId={params.canvasId}
                  isPublished={Boolean(canvasQuery.data?.isPublished)}
                  disabled={!canvasQuery.data || !boardHydrated || Boolean(boardCrashMessage)}
                  className="hidden md:inline-flex rounded-full"
                />

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

                  <div
                    className="absolute inset-0 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-0"
                    onPointerDownCapture={(event) => {
                      try {
                        const active = document.activeElement as HTMLElement | null;
                        const chatDesktop = desktopChatInputElRef.current;
                        const chatMobile = mobileChatInputElRef.current;
                        if (active && (active === chatDesktop || active === chatMobile)) {
                          active.blur();
                        }
                    } catch {
                      // ignore
                    }
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

                openPinnedEditPopover(anchor);
              } catch {
                // ignore
              }
            }}
          >
                {!tldrawLicenseMissing ? (
                  <Tldraw
                    key={tldrawMountKey}
                    hideUi
                    user={tldrawUser}
                    inferDarkMode={false}
                    licenseKey={tldrawLicenseKey || undefined}
                    shapeUtils={shapeUtils}
                    components={tldrawComponents}
                    className="pigcasso-paper-tldraw"
                    onMount={handleTldrawMount}
                  />
                ) : null}
                {tldrawLicenseMissing ? (
                  <div className="absolute inset-0 z-[60] grid place-items-center bg-background/80 backdrop-blur-sm p-6">
                    <div className="w-full max-w-md rounded-2xl border bg-card shadow-soft p-5 space-y-3">
                      <div className="text-sm font-semibold">Missing tldraw license key</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                        Production deployments of tldraw require a license key. Set{" "}
                        <span className="font-mono">NEXT_PUBLIC_TLDRAW_LICENSE_KEY</span> in Vercel (or{" "}
                        <span className="font-mono">.env.local</span>) and redeploy.
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button type="button" className="rounded-full" asChild>
                          <a href="https://www.tldraw.dev/pricing" target="_blank" rel="noreferrer">
                            Get a trial license
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="rounded-full"
                          onClick={async () => {
                            const copied = await copyTextToClipboard("NEXT_PUBLIC_TLDRAW_LICENSE_KEY=");
                            toast.message(copied ? "Copied env var name." : "Couldn’t copy.", { duration: 2000 });
                          }}
                        >
                          Copy env var
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              {!boardHydrated && !tldrawLicenseMissing ? (
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
                className="fixed z-[60] w-[420px] max-w-[calc(100vw-24px)] rounded-2xl border bg-card/90 backdrop-blur shadow-soft p-3"
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

                <div className="mt-2 flex items-end gap-2">
                  <Textarea
	                    value={tabInstruction}
	                    onChange={(e) => setTabInstruction(e.target.value)}
	                    placeholder="Describe the change…"
	                    className="min-h-[80px] max-h-[160px] resize-none bg-background"
	                    autoFocus
	                    disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
	                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setTabAnchor(null);
                        return;
                      }
                      if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey) {
                        event.preventDefault();
                        if (!tabInstruction.trim()) return;
                        const anchor = tabAnchor;
                        setTabAnchor(null);
                        void sendMessage(tabInstruction, {
                          point: anchor.pagePoint,
                          shapeId: anchor.shapeId,
                          shapeIds: pinnedShapeIds,
                        });
                      }
                    }}
                  />

	                  <Button
	                    type="button"
	                    size="icon"
	                    className="rounded-full"
	                    disabled={
	                      !tabInstruction.trim() ||
	                      !editor ||
	                      !boardHydrated ||
	                      Boolean(boardCrashMessage)
	                    }
                    aria-label="Send pin edit"
                    onClick={() => {
                      if (!tabInstruction.trim()) return;
                      const anchor = tabAnchor;
                      setTabAnchor(null);
                      void sendMessage(tabInstruction, {
                        point: anchor.pagePoint,
                        shapeId: anchor.shapeId,
                        shapeIds: pinnedShapeIds,
                      });
                    }}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                  </Button>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Tip: Alt+click (or tap the pin button) to anchor an edit.
                </div>
              </div>
            ) : null}

              <CanvasMentionPicker
                anchor={mentionPicker}
                query={activeAtMention?.query}
                items={filteredMentionShapes}
                onClose={closeMentionPicker}
                onPick={pickMention}
              />

            <CanvasMobileDock
              buttons={DOCK_BUTTONS}
              activeTool={activeTool}
              disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
              onToolChange={applyTool}
              onOpenChat={() => setMobileChatOpen(true)}
              onCreateNew={() => router.push("/app?new=1")}
            />
          <CanvasChatPanel
            desktopOpen={desktopChatOpen}
            onDesktopOpenChange={setDesktopChatOpen}
            mobileOpen={mobileChatOpen}
            onMobileOpenChange={setMobileChatOpen}
            hasOutputs={Boolean(allAttachments.length)}
            onUploadFiles={(files) => void handleUploadFiles(files)}
            onOpenDownloads={() => setDownloadsOpen(true)}
            chatSuggestions={chatSuggestions}
            onPickSuggestion={(prompt) => {
              chatInputRef.current = prompt;
              setChatInput(prompt);
            }}
            clickEditArmed={clickEditArmed}
            onCancelPinEdit={() => setClickEditArmed(false)}
            pinnedContexts={pinnedContexts}
            onFocusShape={focusShapeId}
            onRemovePinnedContext={(shapeId) => {
              setPinnedShapeIds((current) => current.filter((id) => id !== shapeId));
            }}
            selectionContext={selectionContext}
            recentAttachments={recentAttachments}
            messages={messages}
            busy={busy}
            busyLabel={aiUiJob?.label ?? null}
            busySince={aiUiJob?.startedAt ?? null}
            busyCounts={aiJobCounts}
            desktopEndRef={desktopChatEndRef}
            mobileEndRef={mobileChatEndRef}
            desktopInputRef={desktopChatInputElRef}
            mobileInputRef={mobileChatInputElRef}
            chatInput={chatInput}
            onChatInputChange={(value, meta) => {
              chatInputRef.current = value;
              setChatInput(value);
              chatCursorIndexRef.current = meta?.selectionStart ?? null;
            }}
            onSend={() => void sendMessage(undefined, { shapeIds: pinnedShapeIds })}
            onDesktopTogglePinEdit={() => {
              if (activeTool !== "select") {
                setActiveTool("select");
                try {
                  editor?.setCurrentTool(toTldrawToolId("select") as any);
                } catch {
                  // ignore
                }
              }
              if (!editor || !boardHydrated || boardCrashMessage) {
                toast.message("Canvas is still loading. Try again in a moment.", { duration: 2200 });
                return;
              }

              const selectedId = selectionContext?.shapeId ?? null;
              if (selectedId) {
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
                    return;
                  }
                } catch {
                  // ignore
                }
              }

              setClickEditArmed((current) => {
                const next = !current;
                if (next) {
                  toast.message("Click on the canvas to pin an edit.", { duration: 2200 });
                }
                return next;
              });
            }}
            onMobileTogglePinEdit={() => {
              if (activeTool !== "select") {
                setActiveTool("select");
                try {
                  editor?.setCurrentTool(toTldrawToolId("select") as any);
                } catch {
                  // ignore
                }
              }

              if (!editor || !boardHydrated || boardCrashMessage) {
                toast.message("Canvas is still loading. Try again in a moment.", { duration: 2200 });
                return;
              }

              const selectedId = selectionContext?.shapeId ?? null;
              if (selectedId) {
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
                    setMobileChatOpen(false);
                    return;
                  }
                } catch {
                  // ignore
                }
              }

              setClickEditArmed((current) => {
                const next = !current;
                if (next) {
                  toast.message("Tap on the canvas to pin an edit.", { duration: 2200 });
                  setMobileChatOpen(false);
                }
                return next;
              });
            }}
            aiProfile={aiProfile}
            onAiProfileChange={(profile) => {
              setAiProfile(profile);
              try {
                window.localStorage.setItem(NANO_BANANA_PROFILE_STORAGE_KEY, profile);
              } catch {
                // ignore
              }
            }}
            disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
            boardCrashMessage={boardCrashMessage}
            mentionPickerOpen={Boolean(mentionPicker)}
            onCloseMentionPicker={closeMentionPicker}
            onOpenMentionPicker={(input) => openMentionPicker(input)}
            onDesktopMentionButtonClick={onDesktopMentionButtonClick}
            onMobileMentionButtonClick={onMobileMentionButtonClick}
          />
        </div>
      </main>

      <CanvasDownloadsDialog
        open={downloadsOpen}
        onOpenChange={setDownloadsOpen}
        attachments={allAttachments}
        editor={editor}
        onFocusShape={focusShapeId}
      />

      <CanvasExportNftDialog
        open={exportNftOpen}
        onOpenChange={(next) => {
          setExportNftOpen(next);
          if (!next) setExportNftTarget(null);
        }}
        target={exportNftTarget}
      />

      <CanvasPrintrLaunchDialog
        open={printrOpen}
        onOpenChange={(next) => {
          setPrintrOpen(next);
          if (!next) setPrintrTarget(null);
        }}
        target={printrTarget}
      />

      <CanvasHtmlCodeDialog
        open={htmlCodeDialogOpen}
        onOpenChange={setHtmlCodeDialogOpen}
        html={htmlCodeDialogHtml}
        filename={htmlCodeDialogFilename}
      />

      <CanvasDebugPanel
        enabled={debug}
        editorPresent={Boolean(editor)}
        boardHydrated={boardHydrated}
        remounting={remountingRef.current}
        mounts={mountCountRef.current}
        unmounts={unmountCountRef.current}
        mountKey={tldrawMountKey}
        lastMountAt={lastMountAtRef.current}
        lastUnmountAt={lastUnmountAtRef.current}
        autoRecoverAttempts={autoRecoverAttemptsRef.current}
        boardCrashMessage={boardCrashMessage}
      />
    </div>
  );
}
