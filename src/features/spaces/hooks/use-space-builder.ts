"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import type { Layout } from "react-grid-layout";

import { useMySpaceDocument } from "@/features/spaces/api/use-my-space-document";
import { useUpdateMySpaceDocument } from "@/features/spaces/api/use-update-my-space-document";
import { applyLayoutToBlocks, getNextRowY } from "@/features/spaces/lib/space-layout";
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
  const documentRef = useRef<SpaceDocument | null>(null);
  const changeVersionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const [mode, setMode] = useState<SpaceBuilderMode>("edit");
  const [document, setDocument] = useState<SpaceDocument | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [changeVersion, setChangeVersion] = useState(0);
  const [savedVersion, setSavedVersion] = useState(0);

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    documentRef.current = data.document;
    setDocument(data.document);
    setIsPublished(data.isPublished);
    setSelectedId(data.document.blocks[0]?.id ?? null);
    changeVersionRef.current = 0;
    savedVersionRef.current = 0;
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
    saveDebounced(document, isPublished, changeVersion);
    return () => {
      saveDebounced.cancel();
    };
  }, [document, isDirty, isPublished, changeVersion, saveDebounced]);

  const bumpVersion = () => {
    changeVersionRef.current += 1;
    setChangeVersion(changeVersionRef.current);
    return changeVersionRef.current;
  };

  const updateDocument = (next: SpaceDocument) => {
    documentRef.current = next;
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
    const nextRow = getNextRowY(document.blocks);

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
    updateDocument({ ...document, blocks: nextBlocks });
  };

  const publish = () => {
    const currentDocument = documentRef.current;
    if (!currentDocument || saveMutation.isPending) return;

    saveDebounced.cancel();
    setIsPublished(true);
    const version = bumpVersion();

    saveMutation.mutate(
      { document: currentDocument, isPublished: true },
      {
        onSuccess: () => {
          savedVersionRef.current = version;
          setSavedVersion(version);
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
