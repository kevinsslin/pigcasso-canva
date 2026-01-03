"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import type { Layout } from "react-grid-layout";

import { useMySpaceDocument } from "@/features/spaces/api/use-my-space-document";
import { useUpdateMySpaceDocument } from "@/features/spaces/api/use-update-my-space-document";
import {
  applyLayoutToBlocks,
  getNextRowY,
  hasLayoutOverlap,
  insertBlockAvoidingOverlap,
  normalizeBlocksLayout,
  resolveLayoutCollisions,
} from "@/features/spaces/lib/space-layout";
import { spaceDocumentSchema, type SpaceBlock, type SpaceDocument } from "@/features/spaces/lib/space-document";
import { SPACE_GRID_COLUMNS } from "@/features/spaces/lib/space-grid";
import type { SpaceModuleDefinition } from "@/features/spaces/lib/space-modules";

export type SpaceBuilderMode = "edit" | "preview";

export type SpaceModulePlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SpaceBuilderController = {
  mode: SpaceBuilderMode;
  setMode: (mode: SpaceBuilderMode) => void;
  document: SpaceDocument | null;
  isPublished: boolean;
  hasLiveChanges: boolean;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedBlock: SpaceBlock | null;
  visibleBlocks: SpaceBlock[];
  isLoading: boolean;
  error: Error | null;
  isDirty: boolean;
  isSaving: boolean;
  saveStatus: "saving" | "dirty" | "saved";
  addModule: (module: SpaceModuleDefinition, placement?: SpaceModulePlacement) => void;
  updateBlock: (block: SpaceBlock) => void;
  deleteSelectedBlock: () => void;
  duplicateSelectedBlock: () => void;
  onLayoutChange: (layout: Layout) => void;
  publish: (documentOverride?: SpaceDocument) => Promise<boolean>;
};

export const useSpaceBuilder = (): SpaceBuilderController => {
  const { data, isLoading, error } = useMySpaceDocument();
  const saveMutation = useUpdateMySpaceDocument();

  const hydratedRef = useRef(false);
  const documentRef = useRef<SpaceDocument | null>(null);
  const publishedDocumentRef = useRef<SpaceDocument | null>(null);
  const changeVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const [mode, setMode] = useState<SpaceBuilderMode>("edit");
  const [document, setDocument] = useState<SpaceDocument | null>(null);
  const [publishedDocument, setPublishedDocument] = useState<SpaceDocument | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [changeVersion, setChangeVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    const normalizedDocument: SpaceDocument = {
      ...data.document,
      blocks: normalizeBlocksLayout(data.document.blocks, SPACE_GRID_COLUMNS),
    };

    const normalizedPublished = data.publishedDocument
      ? ({
          ...data.publishedDocument,
          blocks: normalizeBlocksLayout(data.publishedDocument.blocks, SPACE_GRID_COLUMNS),
        } satisfies SpaceDocument)
      : null;

    documentRef.current = normalizedDocument;
    publishedDocumentRef.current = normalizedPublished;
    setDocument(normalizedDocument);
    setPublishedDocument(normalizedPublished);
    setIsPublished(data.isPublished);
    setSelectedId(normalizedDocument.blocks[0]?.id ?? null);
    changeVersionRef.current = 0;
    savedVersionRef.current = 0;
    setChangeVersion(0);
    setSavedVersion(0);
  }, [data]);

  const isDirty = changeVersion !== savedVersion;

  const hasLiveChanges = useMemo(() => {
    if (!document || !isPublished) return false;
    const published = publishedDocument ?? publishedDocumentRef.current;
    if (!published) return true;
    return JSON.stringify(document) !== JSON.stringify(published);
  }, [document, isPublished, publishedDocument]);

  const saveDebounced = useMemo(
    () =>
      debounce((nextDocument: SpaceDocument, version: number) => {
        saveMutation.mutate(
          { document: nextDocument },
          {
            onSuccess: () => {
              savedVersionRef.current = version;
              setSavedVersion(version);
            },
          },
        );
      }, 900),
    [saveMutation],
  );

  useEffect(() => {
    if (!hydratedRef.current || !document || !isDirty) return;
    saveDebounced(document, changeVersion);
    return () => {
      saveDebounced.cancel();
    };
  }, [document, isDirty, changeVersion, saveDebounced]);

  const bumpVersion = () => {
    changeVersionRef.current += 1;
    setChangeVersion(changeVersionRef.current);
    return changeVersionRef.current;
  };

  const updateDocument = (next: SpaceDocument) => {
    const normalized: SpaceDocument = {
      ...next,
      blocks: normalizeBlocksLayout(next.blocks, SPACE_GRID_COLUMNS),
    };
    documentRef.current = normalized;
    setDocument(normalized);
    bumpVersion();
  };

  const updateBlock = (nextBlock: SpaceBlock) => {
    const currentDocument = documentRef.current;
    if (!currentDocument) return;
    const nextBlocks = currentDocument.blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block));
    updateDocument({ ...currentDocument, blocks: nextBlocks });
  };

  const deleteSelectedBlock = () => {
    const currentDocument = documentRef.current;
    if (!currentDocument || !selectedId) return;
    const nextBlocks = currentDocument.blocks.filter((block) => block.id !== selectedId);
    updateDocument({ ...currentDocument, blocks: nextBlocks });
    setSelectedId(nextBlocks[0]?.id ?? null);
  };

  const duplicateSelectedBlock = () => {
    const currentDocument = documentRef.current;
    if (!currentDocument || !selectedId) return;
    const selectedBlock = currentDocument.blocks.find((block) => block.id === selectedId);
    if (!selectedBlock) return;

    const clonedBlock = (() => {
      if (typeof structuredClone === "function") {
        return structuredClone(selectedBlock) as SpaceBlock;
      }

      return JSON.parse(JSON.stringify(selectedBlock)) as SpaceBlock;
    })();

    const w = selectedBlock.layout.w;
    const nextX = Math.max(0, Math.min(selectedBlock.layout.x + 1, SPACE_GRID_COLUMNS - w));
    const duplicate: SpaceBlock = {
      ...clonedBlock,
      id: crypto.randomUUID(),
      layout: { ...selectedBlock.layout, x: nextX },
    };

    const nextBlocks = insertBlockAvoidingOverlap(currentDocument.blocks, duplicate, SPACE_GRID_COLUMNS);
    updateDocument({ ...currentDocument, blocks: nextBlocks });
    setSelectedId(duplicate.id);
  };

  const addModule = (module: SpaceModuleDefinition, placement?: SpaceModulePlacement) => {
    const currentDocument = documentRef.current;
    if (!currentDocument) return;
    const nextRow = getNextRowY(currentDocument.blocks);

    const w = Math.max(1, Math.min(placement?.w ?? module.defaultLayout.w, SPACE_GRID_COLUMNS));
    const x = Math.max(0, Math.min(placement?.x ?? 0, SPACE_GRID_COLUMNS - w));
    const y = Math.max(0, placement?.y ?? nextRow);
    const h = Math.max(1, placement?.h ?? module.defaultLayout.h);

    const block: SpaceBlock = {
      id: crypto.randomUUID(),
      type: module.type,
      isVisible: true,
      layout: { x, y, w, h },
      data: module.createData(),
    } as SpaceBlock;

    const nextBlocks = placement
      ? normalizeBlocksLayout([...currentDocument.blocks, block], SPACE_GRID_COLUMNS)
      : insertBlockAvoidingOverlap(currentDocument.blocks, block, SPACE_GRID_COLUMNS);
    const nextDocument: SpaceDocument = { ...currentDocument, blocks: nextBlocks };
    const parsed = spaceDocumentSchema.safeParse(nextDocument);
    if (!parsed.success) {
      toast.error("Failed to add module (invalid document).");
      return;
    }

    updateDocument(parsed.data);
    setSelectedId(block.id);
  };

  const onLayoutChange = (layout: Layout) => {
    const currentDocument = documentRef.current;
    if (!currentDocument) return;

    const ids = new Set(currentDocument.blocks.map((block) => block.id));
    const nextLayout = layout.filter((item) => ids.has(item.i));
    if (!nextLayout.length) return;

    const safeLayout = hasLayoutOverlap(nextLayout)
      ? resolveLayoutCollisions(nextLayout, SPACE_GRID_COLUMNS)
      : nextLayout;

    const nextBlocks = applyLayoutToBlocks(currentDocument.blocks, safeLayout);
    updateDocument({ ...currentDocument, blocks: nextBlocks });
  };

  const publish = async (documentOverride?: SpaceDocument) => {
    const currentDocument = documentOverride ?? documentRef.current;
    if (!currentDocument || saveMutation.isPending) return false;

    saveDebounced.cancel();
    const version = changeVersionRef.current;

    try {
      await saveMutation.mutateAsync({ document: currentDocument, isPublished: true });
      setIsPublished(true);
      publishedDocumentRef.current = currentDocument;
      setPublishedDocument(currentDocument);
      savedVersionRef.current = version;
      setSavedVersion(version);
      toast.success("Space published.");
      return true;
    } catch {
      return false;
    }
  };

  const selectedBlock = document?.blocks.find((block) => block.id === selectedId) ?? null;
  const visibleBlocks = useMemo(
    () => (document ? document.blocks.filter((block) => block.isVisible || mode === "edit") : []),
    [document, mode],
  );

  const saveStatus: SpaceBuilderController["saveStatus"] = saveMutation.isPending
    ? "saving"
    : isDirty
      ? "dirty"
      : "saved";

  return {
    mode,
    setMode,
    document,
    isPublished,
    hasLiveChanges,
    selectedId,
    setSelectedId,
    selectedBlock,
    visibleBlocks,
    isLoading: isLoading || (!error && !document),
    error: error ?? null,
    isDirty,
    isSaving: saveMutation.isPending,
    saveStatus,
    addModule,
    updateBlock,
    deleteSelectedBlock,
    duplicateSelectedBlock,
    onLayoutChange,
    publish,
  };
};
