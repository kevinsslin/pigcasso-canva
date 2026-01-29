"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowUp, Loader2, RotateCcw, X } from "lucide-react";
import { type Editor as TldrawEditor, useTldrawUser } from "tldraw";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
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
import { createHtmlCardSrcDoc } from "@/features/canvases/tldraw/html-card";
import { HtmlCardShapeUtil } from "@/features/canvases/tldraw/html-card-shape";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { PigcassoTextShapeUtil } from "@/features/canvases/tldraw/pigcasso-text-shape-util";
import { type CanvasClipboardRef } from "@/features/canvases/tldraw/keyboard-shortcuts";
import {
  createAiJobMutex,
  createAiJobQueue,
  type AiJobQueue,
  type AiJobQueueCounts,
  type AiJobMutex,
} from "@/features/canvases/lib/ai-job-queue";
import { getApiErrorStatus } from "@/lib/api-error";
import { copyTextToClipboard } from "@/lib/clipboard";

import { CanvasToolRail } from "@/features/canvases/components/canvas-tool-rail";
import { CANVAS_TOOL_BUTTONS, toTldrawToolId, type CanvasTool } from "@/features/canvases/lib/canvas-tools";
import { getCanvasChatSuggestions } from "@/features/canvases/lib/chat-suggestions";
import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import { applyAtMentionReplacement } from "@/features/canvases/lib/at-mentions";
import { getSelectionContext } from "@/features/canvases/lib/selection-context";
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
import { CanvasSelectionToolbar } from "@/features/canvases/screens/canvas-screen/canvas-selection-toolbar";
import { useAiUiJob } from "@/features/canvases/screens/canvas-screen/hooks/use-ai-ui-job";
import { useCanvasAttachments } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-attachments";
import { useCanvasChatStorage } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-chat-storage";
import { useCanvasEditorSync } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-editor-sync";
import { useCanvasHtmlPreviews } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-html-previews";
import { useCanvasMentions } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-mentions";
import { useCanvasPinEdit } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-pin-edit";
import { useCanvasSelectedImageActions } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-selected-image-actions";
import { useCanvasSelection } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-selection";
import { useCanvasSendMessage } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-send-message";
import { useCanvasSnapshotPersistence } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-snapshot-persistence";
import { useCanvasUploads } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-uploads";
import { useCanvasSnapshotHydration } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-snapshot-hydration";
import { useCanvasDisconnectRecovery } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-disconnect-recovery";
import { useCanvasExportActions } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-export-actions";
import { useCanvasFullscreen } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-fullscreen";
import { useCanvasHotkeys } from "@/features/canvases/screens/canvas-screen/hooks/use-canvas-hotkeys";
import type { CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";
import { CanvasOverlayHeader } from "@/features/canvases/screens/canvas-screen/components/canvas-overlay-header";
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
  const [htmlCodeDialogOpen, setHtmlCodeDialogOpen] = useState(false);
  const [htmlCodeDialogHtml, setHtmlCodeDialogHtml] = useState("");
  const [htmlCodeDialogFilename, setHtmlCodeDialogFilename] = useState("HTML");
  const { isFullscreen, toggleFullscreen } = useCanvasFullscreen();

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
  const lastKnownToolIdRef = useRef<CanvasTool | null>(null);
  const lastZoomPercentRef = useRef<number | null>(null);
  const lastSelectionShapeIdRef = useRef<string | null>(null);
  const lastSelectedShapeIdsKeyRef = useRef<string>("");
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
  const selectionToolbarSuppressed = downloadsOpen || exportNftOpen || printrOpen || htmlCodeDialogOpen;
  const {
    selectionContext,
    setSelectionContext,
    selectedShapeIds,
    setSelectedShapeIds,
    setSelectionToolbarAnchor,
    setSelectedTextStyleKey,
    selectedTextShape,
    selectedImageShape,
    selectedHtmlShape,
    selectedImageAsset,
    selectedImageAiSrc,
    selectedTextStyle,
    updateSelectedTextStyle,
    resolvedSelectionToolbarAnchor,
    selectedGroupMintImageShapeId,
  } = useCanvasSelection({ editor, selectionToolbarSuppressed });
  const {
    clickEditArmed,
    setClickEditArmed,
    tabAnchor,
    setTabAnchor,
    tabInstruction,
    setTabInstruction,
    tabPointerDownRef,
    handleCanvasPointerDownCapture,
    handleCanvasPointerUpCapture,
    onDesktopTogglePinEdit,
    onMobileTogglePinEdit,
  } = useCanvasPinEdit({
    editor,
    activeTool,
    boardHydrated,
    boardCrashMessage,
    selectionContext,
    setActiveTool,
    setMobileChatOpen,
  });

  useEffect(() => {
    chatInputRef.current = chatInput;
  }, [chatInput]);

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

  useCanvasHotkeys({
    editor,
    boardHydrated,
    boardCrashMessage,
    activeTool,
    onToolChange: applyTool,
    clipboardRef: canvasClipboardRef,
  });

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

  const { reloadBoard } = useCanvasDisconnectRecovery({
    enabled: ready && authenticated && !tldrawLicenseMissing,
    editor,
    boardHydrated: hasEverHydratedRef.current,
    boardCrashMessage,
    hasMountedEditor: hasMountedEditorRef.current,
    remounting: remountingRef.current,
    remountingRef,
    disconnectStreakRef,
    autoRecoverAttemptsRef,
    reloadTimeoutRef,
    loadedSnapshotEditorRef,
    hydratingRef,
    hasProxiedImageAssetsRef,
    hasUserEditedRef,
    hasShownRemoteSyncSkippedToastRef,
    tabPointerDownRef,
    setTabAnchor,
    setActiveTool,
    setTldrawMountKey,
    setBoardCrashMessage,
    setBoardHydrated,
    lastKnownToolIdRef,
  });

  useEffect(() => {
    const serverName = canvasQuery.data?.name;
    if (!serverName) return;
    setCanvasName(serverName);
  }, [canvasQuery.data?.name]);

  useCanvasSnapshotHydration({
    editor,
    localSnapshotKey,
    canvasQuery: { data: canvasQuery.data, isError: canvasQuery.isError, isSuccess: canvasQuery.isSuccess },
    setBoardHydrated,
    loadedSnapshotEditorRef,
    hydratingRef,
    lastSavedSnapshotRef,
    hasProxiedImageAssetsRef,
    hasUserEditedRef,
    hasShownRemoteSyncSkippedToastRef,
  });

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

  const handleClearQueuedJobs = useCallback(() => {
    const queue = aiJobQueueRef.current;
    if (!queue) return;
    const cleared = queue.clearQueued();
    if (!cleared) return;
    toast.message(`Cleared ${cleared} queued job${cleared === 1 ? "" : "s"}.`, { duration: 2000 });
  }, []);

  const pinnedContexts = useMemo(() => {
    if (!editor) return [];
    return pinnedShapeIds
      .map((shapeId) => getSelectionContext(editor as any, shapeId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [editor, pinnedShapeIds]);

  const { regenerateSelectedImage, removeBackgroundFromSelectedImage, makeSelectedImageTextEditable } =
    useCanvasSelectedImageActions({
      editor,
      boardHydrated,
      boardCrashMessage,
      aiProfile,
      aiJobQueueRef,
      startAiUiJob,
      updateAiUiJobLabel,
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

  const { downloadSelectedImage, exportSelectedSelectionAsPng, mintSelectionAsNft, launchSelectionOnPrintr } =
    useCanvasExportActions({
      editor,
      boardHydrated,
      boardCrashMessage,
      canvasId: params.canvasId,
      canvasName,
      selectedShapeIds,
      selectedImageShape,
      selectedImageAsset,
      selectedGroupMintImageShapeId,
      setExportNftOpen,
      setExportNftTarget,
      setPrintrOpen,
      setPrintrTarget,
    });

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
    if (typeof window === "undefined") return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pigcasso_html_${Date.now()}.html`;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }, [selectedHtmlShape]);

  const reorderSelectedShapes = useCallback(
    (mode: "front" | "forward" | "backward" | "back") => {
      if (!editor || !boardHydrated || boardCrashMessage) return;
      const ids = (editor.getSelectedShapeIds?.() ?? []).map((id) => String(id));
      if (!ids.length) return;

      try {
        if (mode === "front") {
          editor.bringToFront?.(ids as any);
        } else if (mode === "forward") {
          editor.bringForward?.(ids as any);
        } else if (mode === "backward") {
          editor.sendBackward?.(ids as any);
        } else {
          editor.sendToBack?.(ids as any);
        }
      } catch {
        toast.error("Couldn’t reorder layers.", { duration: 2500 });
      }
    },
    [boardCrashMessage, boardHydrated, editor],
  );

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

  const { recentAttachments, allAttachments, hasOutputs } = useCanvasAttachments(messages);

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
          <CanvasOverlayHeader
            canvasId={params.canvasId}
            canvasName={canvasName}
            onRenameBoard={handleRenameBoard}
            zoomPercent={zoomPercent}
            editor={editor}
            disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
            desktopChatOpen={desktopChatOpen}
            onToggleDesktopChat={() => setDesktopChatOpen((current) => !current)}
            onOpenMobileChat={() => setMobileChatOpen(true)}
            isPublished={Boolean(canvasQuery.data?.isPublished)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => void toggleFullscreen()}
          />

          {typeof document === "undefined" || selectionToolbarSuppressed
            ? null
            : createPortal(
                <CanvasSelectionToolbar
                  anchor={resolvedSelectionToolbarAnchor}
                  disabled={!editor || !boardHydrated || Boolean(boardCrashMessage)}
                  onAddToChat={() => addSelectionToChat()}
                  onBringForward={() => reorderSelectedShapes("forward")}
                  onBringToFront={() => reorderSelectedShapes("front")}
                  onDownloadSelected={() => void downloadSelectedImage()}
                  onExportSelectionPng={() => void exportSelectedSelectionAsPng()}
                  onDownloadSelectedHtml={() => downloadSelectedHtml()}
                  onMintNft={() => mintSelectionAsNft()}
                  onLaunchPrintr={() => launchSelectionOnPrintr()}
                  showMintNft={Boolean(selectedGroupMintImageShapeId) || Boolean(selectedImageShape)}
                  onRegenerate={() => void regenerateSelectedImage()}
                  onRemoveBackground={() => void removeBackgroundFromSelectedImage()}
                  onMakeTextEditable={() => void makeSelectedImageTextEditable()}
                  onSendBackward={() => reorderSelectedShapes("backward")}
                  onSendToBack={() => reorderSelectedShapes("back")}
                  onViewHtmlCode={() => viewSelectedHtmlCode()}
                  onUngroup={() => void ungroupSelectedShapes()}
                  textStyle={selectedTextShape ? selectedTextStyle : null}
                  onUpdateTextStyle={updateSelectedTextStyle}
                />,
                document.body,
              )}

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
              handleCanvasPointerDownCapture(event);
            }}
            onPointerUpCapture={handleCanvasPointerUpCapture}
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
                    {boardCrashMessage.startsWith("Board disconnected") ? "Board disconnected" : "Board crashed"}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{boardCrashMessage}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button type="button" className="rounded-full" onClick={reloadBoard}>
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
            className="pigcasso-paper-lines fixed z-[60] w-[420px] max-w-[calc(100vw-24px)] rounded-2xl border bg-card/90 backdrop-blur shadow-soft p-3"
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
                disabled={!tabInstruction.trim() || !editor || !boardHydrated || Boolean(boardCrashMessage)}
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
          hasOutputs={hasOutputs}
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
          onClearQueuedJobs={handleClearQueuedJobs}
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
          onDesktopTogglePinEdit={onDesktopTogglePinEdit}
          onMobileTogglePinEdit={onMobileTogglePinEdit}
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
