import { useEffect } from "react";
import { toast } from "sonner";
import { loadSnapshot } from "tldraw";

import { toCanvasImageUrl } from "@/features/canvases/lib/image-proxy";
import { sanitizeTldrawStoreSnapshot } from "@/features/canvases/tldraw/sanitize-snapshot";

type CanvasQueryLike = {
  data?: { snapshot?: string | null } | null;
  isSuccess: boolean;
  isError: boolean;
};

export const useCanvasSnapshotHydration = (params: {
  editor: any | null;
  localSnapshotKey: string;
  canvasQuery: CanvasQueryLike;
  setBoardHydrated: (next: boolean) => void;
  loadedSnapshotEditorRef: { current: any | null };
  hydratingRef: { current: boolean };
  lastSavedSnapshotRef: { current: string | null };
  hasProxiedImageAssetsRef: { current: boolean };
  hasUserEditedRef: { current: boolean };
  hasShownRemoteSyncSkippedToastRef: { current: boolean };
}) => {
  const {
    editor,
    localSnapshotKey,
    canvasQuery,
    setBoardHydrated,
    loadedSnapshotEditorRef,
    hydratingRef,
    lastSavedSnapshotRef,
    hasProxiedImageAssetsRef,
    hasUserEditedRef,
    hasShownRemoteSyncSkippedToastRef,
  } = params;

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
  }, [
    canvasQuery.data,
    canvasQuery.isError,
    canvasQuery.isSuccess,
    editor,
    hasProxiedImageAssetsRef,
    hasShownRemoteSyncSkippedToastRef,
    hasUserEditedRef,
    hydratingRef,
    lastSavedSnapshotRef,
    localSnapshotKey,
    loadedSnapshotEditorRef,
    setBoardHydrated,
  ]);
};
