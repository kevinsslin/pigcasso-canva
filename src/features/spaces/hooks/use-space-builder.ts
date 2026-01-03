"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import type { Layout } from "react-grid-layout";

import { useMySpaceDocument } from "@/features/spaces/api/use-my-space-document";
import { useUpdateMySpaceDocument } from "@/features/spaces/api/use-update-my-space-document";
import { applyLayoutToBlocks, getNextRowY } from "@/features/spaces/lib/space-layout";
import { spaceDocumentSchema, type SpaceBlock, type SpaceDocument } from "@/features/spaces/lib/space-document";
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
  onLayoutChange: (layout: Layout) => void;
  publish: () => void;
};

export const useSpaceBuilder = (): SpaceBuilderController => {
  const { data, isLoading, error } = useMySpaceDocument();
  const saveMutation = useUpdateMySpaceDocument();

  const hydratedRef = useRef(false);
  const [mode, setMode] = useState<SpaceBuilderMode>("edit");
  const [document, setDocument] = useState<SpaceDocument | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [changeVersion, setChangeVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    setDocument(data.document);
    setIsPublished(data.isPublished);
    setSelectedId(data.document.blocks[0]?.id ?? null);
    setChangeVersion(0);
    setSavedVersion(0);
  }, [data]);

  const isDirty = changeVersion !== savedVersion;

  const saveDebounced = useMemo(
    () =>
      debounce((nextDocument: SpaceDocument, nextPublished: boolean, version: number) => {
        saveMutation.mutate(
          { document: nextDocument, isPublished: nextPublished },
          {
            onSuccess: () => setSavedVersion(version),
          },
        );
      }, 900),
    [saveMutation],
  );

  useEffect(() => {
    if (!hydratedRef.current || !document || !isDirty) return;
    saveDebounced(document, isPublished, changeVersion);
    return () => {
      saveDebounced.cancel();
    };
  }, [document, isDirty, isPublished, changeVersion, saveDebounced]);

  const bumpVersion = () => setChangeVersion((current) => current + 1);

  const updateDocument = (next: SpaceDocument) => {
    setDocument(next);
    bumpVersion();
  };

  const updateBlock = (nextBlock: SpaceBlock) => {
    if (!document) return;
    const nextBlocks = document.blocks.map((block) => (block.id === nextBlock.id ? nextBlock : block));
    updateDocument({ ...document, blocks: nextBlocks });
  };

  const deleteSelectedBlock = () => {
    if (!document || !selectedId) return;
    const nextBlocks = document.blocks.filter((block) => block.id !== selectedId);
    updateDocument({ ...document, blocks: nextBlocks });
    setSelectedId(nextBlocks[0]?.id ?? null);
  };

  const addModule = (module: SpaceModuleDefinition, placement?: SpaceModulePlacement) => {
    if (!document) return;
    const GRID_COLS = 4;
    const nextRow = getNextRowY(document.blocks);

    const w = Math.max(1, Math.min(placement?.w ?? module.defaultLayout.w, GRID_COLS));
    const x = Math.max(0, Math.min(placement?.x ?? 0, GRID_COLS - w));
    const y = Math.max(0, placement?.y ?? nextRow);
    const h = Math.max(1, placement?.h ?? module.defaultLayout.h);

    const block: SpaceBlock = {
      id: crypto.randomUUID(),
      type: module.type,
      isVisible: true,
      layout: { x, y, w, h },
      data: module.createData(),
    } as SpaceBlock;

    const nextDocument: SpaceDocument = { ...document, blocks: [...document.blocks, block] };
    const parsed = spaceDocumentSchema.safeParse(nextDocument);
    if (!parsed.success) {
      toast.error("Failed to add module (invalid document).");
      return;
    }

    updateDocument(parsed.data);
    setSelectedId(block.id);
  };

  const onLayoutChange = (layout: Layout) => {
    if (!document) return;
    const nextBlocks = applyLayoutToBlocks(document.blocks, layout);
    setDocument({ ...document, blocks: nextBlocks });
    bumpVersion();
  };

  const publish = () => {
    if (!document || saveMutation.isPending) return;

    setIsPublished(true);
    bumpVersion();

    saveMutation.mutate(
      { document, isPublished: true },
      {
        onSuccess: () => {
          setSavedVersion(changeVersion + 1);
          toast.success("Space published.");
        },
      },
    );
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
    onLayoutChange,
    publish,
  };
};
