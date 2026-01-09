"use client";

import { fabric } from "fabric";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { Project } from "@/features/projects/api/use-get-project";
import { useUpdateProjectPage } from "@/features/projects/api/use-update-project-page";
import { useCreateProjectPage } from "@/features/projects/api/use-create-project-page";
import { useDeleteProjectPage } from "@/features/projects/api/use-delete-project-page";

import { ActiveTool, selectionDependentTools } from "@/features/editor/types";
import { Navbar } from "@/features/editor/components/navbar";
import { Footer } from "@/features/editor/components/footer";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { Sidebar } from "@/features/editor/components/sidebar";
import { Toolbar } from "@/features/editor/components/toolbar";
import { ShapeSidebar } from "@/features/editor/components/shape-sidebar";
import { FillColorSidebar } from "@/features/editor/components/fill-color-sidebar";
import { StrokeColorSidebar } from "@/features/editor/components/stroke-color-sidebar";
import { StrokeWidthSidebar } from "@/features/editor/components/stroke-width-sidebar";
import { OpacitySidebar } from "@/features/editor/components/opacity-sidebar";
import { TextSidebar } from "@/features/editor/components/text-sidebar";
import { FontSidebar } from "@/features/editor/components/font-sidebar";
import { ImageSidebar } from "@/features/editor/components/image-sidebar";
import { FilterSidebar } from "@/features/editor/components/filter-sidebar";
import { DrawSidebar } from "@/features/editor/components/draw-sidebar";
import { TemplateSidebar } from "@/features/editor/components/template-sidebar";
import { LayersSidebar } from "@/features/editor/components/layers-sidebar";
import { RemoveBgSidebar } from "@/features/editor/components/remove-bg-sidebar";
import { SettingsSidebar } from "@/features/editor/components/settings-sidebar";
import { MobileToolDock } from "@/features/editor/components/mobile-tool-dock";
import { PagesBar, type PageBarItem } from "@/features/editor/components/pages-bar";

import { useConfirm } from "@/hooks/use-confirm";

type EditorProps = {
  initialData: Project;
  initialImageUrl?: string;
  onConsumeInitialImageUrl?: () => void;
};

type PageMeta = Omit<Project["pages"][number], "json">;

const sortPages = (pages: Project["pages"]) =>
  [...pages].sort((a, b) => a.index - b.index);

export const Editor = ({
  initialData,
  initialImageUrl,
  onConsumeInitialImageUrl,
}: EditorProps) => {
  const multiPageEnabled = process.env.NEXT_PUBLIC_ENABLE_MULTI_PAGE === "true";
  const sorted = useMemo(() => sortPages(initialData.pages), [initialData.pages]);
  const initialPage = sorted[0];

  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [pages, setPages] = useState<PageMeta[]>(() =>
    sorted.map(({ json: _json, ...rest }) => rest),
  );
  const pageJsonRef = useRef<Map<string, string>>(
    new Map(sorted.map((page) => [page.id, page.json])),
  );

  const [activePageId, setActivePageId] = useState(() => initialPage?.id ?? initialData.id);
  const activePageIdRef = useRef(activePageId);
  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  const updatePageMutation = useUpdateProjectPage(initialData.id);
  const createPageMutation = useCreateProjectPage(initialData.id);
  const deletePageMutation = useDeleteProjectPage(initialData.id);

  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    "Delete page?",
    "This cannot be undone.",
  );

  const flushSaveRef = useRef<(() => void) | null>(null);

  const onClearSelection = useCallback(() => {
    if (selectionDependentTools.includes(activeTool)) {
      setActiveTool("select");
    }
  }, [activeTool]);

  const mutatePage = updatePageMutation.mutate;

  const savePageNetwork = useMemo(
    () =>
      debounce(
        (payload: { pageId: string; json: string; width: number; height: number }) => {
          mutatePage({
            param: { id: initialData.id, pageId: payload.pageId },
            json: {
              json: payload.json,
              width: payload.width,
              height: payload.height,
            },
          });
        },
        1200,
        { maxWait: 5000 },
      ),
    [initialData.id, mutatePage],
  );

  flushSaveRef.current = () => {
    savePageNetwork.flush();
  };

  useEffect(() => {
    return () => {
      savePageNetwork.flush();
      savePageNetwork.cancel();
    };
  }, [savePageNetwork]);

  useEffect(() => {
    const flush = () => {
      flushSaveRef.current?.();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const onSaveCallback = useCallback(
    (values: { json: string; height: number; width: number }) => {
      const pageId = activePageIdRef.current;
      pageJsonRef.current.set(pageId, values.json);

      setPages((prev) => {
        const index = prev.findIndex((page) => page.id === pageId);
        if (index === -1) return prev;
        const target = prev[index];
        if (target.width === values.width && target.height === values.height) {
          return prev;
        }
        const next = [...prev];
        next[index] = { ...target, width: values.width, height: values.height };
        return next;
      });

      savePageNetwork({
        pageId,
        json: values.json,
        width: values.width,
        height: values.height,
      });
    },
    [savePageNetwork],
  );

  const activePageMeta = useMemo(() => pages.find((page) => page.id === activePageId) ?? null, [
    activePageId,
    pages,
  ]);

  const { init, editor } = useEditor({
    defaultState: pageJsonRef.current.get(activePageId) ?? initialPage?.json ?? "",
    defaultWidth: activePageMeta?.width ?? initialPage?.width ?? initialData.width,
    defaultHeight: activePageMeta?.height ?? initialPage?.height ?? initialData.height,
    clearSelectionCallback: onClearSelection,
    saveCallback: onSaveCallback,
  });

  const onChangeActiveTool = useCallback(
    (tool: ActiveTool) => {
      if (tool === "draw") {
        editor?.enableDrawingMode();
      }

      if (activeTool === "draw") {
        editor?.disableDrawingMode();
      }

      if (tool === activeTool) {
        return setActiveTool("select");
      }

      setActiveTool(tool);
    },
    [activeTool, editor],
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = new fabric.Canvas(canvasRef.current, {
      controlsAboveOverlay: true,
      preserveObjectStacking: true,
    });

    init({
      initialCanvas: canvas,
      initialContainer: containerRef.current!,
    });

    return () => {
      canvas.dispose();
    };
  }, [init]);

  const pagesForBar: PageBarItem[] = useMemo(
    () =>
      [...pages]
        .sort((a, b) => a.index - b.index)
        .map((page) => ({
          id: page.id,
          index: page.index,
          name: page.name ?? null,
          width: page.width,
          height: page.height,
        })),
    [pages],
  );

  const activePageForNavbar = useMemo(
    () => pagesForBar.find((page) => page.id === activePageId) ?? null,
    [activePageId, pagesForBar],
  );

  const loadPage = useCallback(
    (pageId: string) => {
      if (!editor) {
        return;
      }
      const meta = pages.find((page) => page.id === pageId);
      if (!meta) {
        return;
      }
      const json = pageJsonRef.current.get(pageId) ?? "";
      editor.loadPage({ json, width: meta.width, height: meta.height });
    },
    [editor, pages],
  );

  const onSelectPage = useCallback(
    (pageId: string) => {
      if (pageId === activePageIdRef.current) {
        return;
      }
      flushSaveRef.current?.();
      setActivePageId(pageId);
      loadPage(pageId);
    },
    [loadPage],
  );

  const onAddPage = useCallback(async () => {
    if (!editor) {
      toast.error("Editor not ready yet.");
      return;
    }

    flushSaveRef.current?.();

    try {
      const sourceId = activePageIdRef.current;
      const result = await createPageMutation.mutateAsync({
        param: { id: initialData.id },
        json: { sourcePageId: sourceId },
      });

      const created = result.data;
      pageJsonRef.current.set(created.id, created.json);
      const { json: _json, ...createdMeta } = created;

      setPages((prev) => {
        const next: PageMeta[] = [...prev, createdMeta];
        return next.sort((a, b) => a.index - b.index);
      });

      setActivePageId(created.id);
      editor.loadPage({
        json: created.json,
        width: created.width,
        height: created.height,
      });

      toast.success("Page added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create page");
    }
  }, [createPageMutation, editor, initialData.id]);

  const onDeletePage = useCallback(
    async (pageId: string) => {
      if (pages.length <= 1) {
        toast.error("Project must have at least one page.");
        return;
      }

      const target = pages.find((page) => page.id === pageId);
      if (!target) {
        return;
      }

      const ok = await confirmDelete();
      if (!ok) {
        return;
      }

      flushSaveRef.current?.();

      try {
        await deletePageMutation.mutateAsync({
          param: { id: initialData.id, pageId },
        });

        pageJsonRef.current.delete(pageId);

        setPages((prev) => {
          const removed = prev.filter((page) => page.id !== pageId);
          return removed
            .map((page) =>
              page.index > target.index ? { ...page, index: page.index - 1 } : page,
            )
            .sort((a, b) => a.index - b.index);
        });

        if (activePageIdRef.current === pageId) {
          const remaining = pages.filter((page) => page.id !== pageId).sort((a, b) => a.index - b.index);
          const fallback =
            remaining.find((page) => page.index === target.index - 1) ??
            remaining.find((page) => page.index === target.index) ??
            remaining[0] ??
            null;

          if (fallback) {
            setActivePageId(fallback.id);
            loadPage(fallback.id);
          }
        }

        toast.success("Page deleted.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete page");
      }
    },
    [confirmDelete, deletePageMutation, initialData.id, loadPage, pages],
  );

  const initialLoadRef = useRef(false);
  const consumedInitialImageRef = useRef(false);
  useEffect(() => {
    if (!editor) return;
    if (initialLoadRef.current) return;
    const meta = pages.find((page) => page.id === activePageIdRef.current);
    if (!meta) return;
    initialLoadRef.current = true;
    editor.loadPage({
      json: pageJsonRef.current.get(meta.id) ?? "",
      width: meta.width,
      height: meta.height,
    });

    if (!consumedInitialImageRef.current && initialImageUrl) {
      consumedInitialImageRef.current = true;
      editor.addImage(initialImageUrl);
      onConsumeInitialImageUrl?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const pagesBusy = createPageMutation.isPending || deletePageMutation.isPending;

  return (
    <div className="h-[100dvh] flex flex-col">
      <DeleteConfirmDialog />
      <Navbar
        id={initialData.id}
        projectName={initialData.name || "project"}
        activePage={activePageForNavbar}
        editor={editor}
        activeTool={activeTool}
        onChangeActiveTool={onChangeActiveTool}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <ShapeSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FillColorSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <StrokeColorSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <StrokeWidthSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <OpacitySidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <TextSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FontSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <ImageSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <TemplateSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <LayersSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <FilterSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <RemoveBgSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <DrawSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
        <SettingsSidebar editor={editor} activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />

        <main className="bg-muted flex-1 overflow-hidden relative flex flex-col">
          <Toolbar
            editor={editor}
            activeTool={activeTool}
            onChangeActiveTool={onChangeActiveTool}
          />
          <div className="flex-1 bg-muted relative overflow-hidden" ref={containerRef}>
            <canvas ref={canvasRef} />
          </div>
          {multiPageEnabled ? (
            <PagesBar
              pages={pagesForBar}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
              onAddPage={onAddPage}
              onDeletePage={onDeletePage}
              disabled={pagesBusy}
            />
          ) : null}
          <Footer editor={editor} />
        </main>
      </div>
      <MobileToolDock activeTool={activeTool} onChangeActiveTool={onChangeActiveTool} />
    </div>
  );
};
