"use client";

import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { SpaceBuilderHeader } from "@/features/spaces/components/space-builder/space-builder-header";
import { SpaceBuilderCanvas } from "@/features/spaces/components/space-builder/space-builder-canvas";
import { SpaceInspector } from "@/features/spaces/components/space-builder/space-inspector";
import { SpaceModulesPanel } from "@/features/spaces/components/space-builder/space-modules-panel";
import { useSpaceBuilder, type SpaceBuilderController, type SpaceBuilderMode } from "@/features/spaces/hooks/use-space-builder";
import { SPACE_MODULES } from "@/features/spaces/lib/space-modules";
import { useMe } from "@/features/auth/api/use-me";
import { getCanonicalSpaceHandle } from "@/features/spaces/lib/space-handle";
import { shortenWalletAddress } from "@/features/auth/lib/user-display";
import { BentoSpacePage } from "@/features/spaces/components/space-public/bento-space-page";
import { SpacePublishDialog } from "@/features/spaces/components/space-builder/space-publish-dialog";
import type { SpaceDocument } from "@/features/spaces/lib/space-document";

export const SpaceBuilder = ({ initialMode }: { initialMode?: SpaceBuilderMode }) => {
  const builder = useSpaceBuilder();
  const initialModeAppliedRef = useRef(false);
  const me = useMe();
  const [mobilePanel, setMobilePanel] = useState<"canvas" | "modules" | "inspector">("canvas");
  const [modulesOpen, setModulesOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSnapshot, setPublishSnapshot] = useState<SpaceDocument | null>(null);
  const autoMobilePanelRef = useRef(false);
  const { mode, selectedId, deleteSelectedBlock, document: builderDocument, setMode: setBuilderMode } = builder;

  const spaceHandle = me.data?.data.user
    ? getCanonicalSpaceHandle({ id: me.data.data.user.id, socials: me.data.data.user.socials })
    : null;
  const spacePath = spaceHandle ? `/space/${encodeURIComponent(spaceHandle)}` : null;

  const walletAddress = me.data?.data.user.wallets.external ?? me.data?.data.user.wallets.embedded ?? null;
  const walletLabel = walletAddress ? shortenWalletAddress(walletAddress) : null;

  const onToggleVisibilitySelected = () => {
    if (!builder.selectedBlock) return;
    builder.updateBlock({ ...builder.selectedBlock, isVisible: !builder.selectedBlock.isVisible });
  };

  const addModule: SpaceBuilderController["addModule"] = (module, placement) => {
    builder.addModule(module, placement);
    setMobilePanel("canvas");
  };

  useEffect(() => {
    if (initialModeAppliedRef.current) return;
    if (!initialMode) return;
    if (!builderDocument) return;

    setBuilderMode(initialMode);
    initialModeAppliedRef.current = true;
  }, [builderDocument, initialMode, setBuilderMode]);

  useEffect(() => {
    if (mode !== "edit") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === "input" ||
        tagName === "textarea" ||
        Boolean(target?.isContentEditable);

      if (isTypingTarget) return;

      if (event.key === "Escape") {
        setMobilePanel("canvas");
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (!selectedId) return;
        event.preventDefault();
        deleteSelectedBlock();
        setMobilePanel("canvas");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelectedBlock, mode, selectedId]);

  useEffect(() => {
    if (autoMobilePanelRef.current) return;
    if (builder.mode !== "edit") return;
    if (!builder.document) return;
    if (builder.document.blocks.length > 0) return;

    autoMobilePanelRef.current = true;
    setMobilePanel("modules");
  }, [builder.document, builder.mode]);

  if (builder.isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Loading Space Builder…
      </div>
    );
  }

  if (builder.error) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Card className="max-w-md p-6 text-sm">
          <div className="font-bold text-gray-900">Failed to load Space</div>
          <div className="mt-2 text-muted-foreground">{builder.error.message}</div>
        </Card>
      </div>
    );
  }

  if (!builder.document) return null;

  const snapshotDraft = (document: SpaceDocument) => {
    if (typeof structuredClone === "function") {
      return structuredClone(document) as SpaceDocument;
    }

    return JSON.parse(JSON.stringify(document)) as SpaceDocument;
  };

  return (
    <div className="relative flex h-[100dvh] min-h-0 flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 right-[-16rem] h-[38rem] w-[38rem] rounded-full bg-primary/14 blur-3xl motion-safe:animate-[pigcasso-drift_18s_ease-in-out_infinite]" />
        <div className="absolute top-[35%] left-[-16rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/12 blur-3xl motion-safe:animate-[pigcasso-float_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-16rem] right-[20%] h-[34rem] w-[34rem] rounded-full bg-yellow-300/10 blur-3xl motion-safe:animate-[pigcasso-drift_22s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,rgba(236,72,153,0.35)_1px,transparent_1px)] [background-size:52px_52px]" />
      </div>

      <SpaceBuilderHeader
        mode={builder.mode}
        onModeChange={builder.setMode}
        onPublish={() => {
          const currentDocument = builder.document;
          if (!currentDocument) return;
          setPublishSnapshot(snapshotDraft(currentDocument));
          setPublishDialogOpen(true);
        }}
        publishDisabled={builder.isSaving}
        saveStatus={builder.saveStatus}
        isPublished={builder.isPublished}
        hasLiveChanges={builder.hasLiveChanges}
        spacePath={spacePath}
        modulesOpen={modulesOpen}
        inspectorOpen={inspectorOpen}
        onToggleModules={() => setModulesOpen((prev) => !prev)}
        onToggleInspector={() => setInspectorOpen((prev) => !prev)}
      />

      <SpacePublishDialog
        open={publishDialogOpen}
        onOpenChange={(open) => {
          setPublishDialogOpen(open);
          if (!open) setPublishSnapshot(null);
        }}
        document={publishSnapshot ?? builder.document}
        handle={spaceHandle ?? "me"}
        walletLabel={walletLabel}
        spacePath={spacePath}
        isPublished={builder.isPublished}
        hasLiveChanges={builder.hasLiveChanges}
        isPublishing={builder.isSaving}
        onConfirm={async () => {
          const currentDocument = publishSnapshot ?? builder.document;
          if (!currentDocument) return;
          const didPublish = await builder.publish(currentDocument);
          if (didPublish) {
            setPublishDialogOpen(false);
            setPublishSnapshot(null);
          }
        }}
      />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto flex h-full max-w-[1680px] flex-col px-4 pb-6 pt-5 sm:px-6">
          {builder.mode === "preview" ? (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-soft backdrop-blur">
              <div className="shrink-0 border-b border-white/60 bg-white/70 px-5 py-4">
                <div className="text-sm font-extrabold tracking-tight text-gray-900">Preview</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Preview your current draft. Publishing updates{" "}
                  <span className="font-semibold text-gray-700">
                    {spacePath ?? "/space/<your-handle>"}
                  </span>
                  .
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <BentoSpacePage
                  handle={spaceHandle ?? "me"}
                  walletLabel={walletLabel}
                  document={builder.document}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="flex flex-1 min-h-0 flex-col gap-4 lg:hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  {mobilePanel === "modules" ? (
                    <SpaceModulesPanel modules={SPACE_MODULES} onAddModule={addModule} />
                  ) : mobilePanel === "inspector" ? (
                    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-soft backdrop-blur">
                      {builder.selectedBlock ? (
                        <SpaceInspector
                          block={builder.selectedBlock}
                          onChange={builder.updateBlock}
                          onDelete={builder.deleteSelectedBlock}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                          Select a module to edit.
                        </div>
                      )}
                    </aside>
                  ) : (
                    <SpaceBuilderCanvas
                      blocks={builder.visibleBlocks}
                      handle={spaceHandle ?? "me"}
                      walletLabel={walletLabel}
                      mode={builder.mode}
                      selectedId={builder.selectedId}
                      onSelectId={(id) => {
                        builder.setSelectedId(id);
                        setMobilePanel("inspector");
                      }}
                      onDuplicateSelected={builder.duplicateSelectedBlock}
                      onToggleVisibilitySelected={onToggleVisibilitySelected}
                      onDeleteSelected={builder.deleteSelectedBlock}
                      onLayoutChange={builder.onLayoutChange}
                      onDropModule={addModule}
                    />
                  )}
                </div>

                <div className="fixed bottom-4 left-0 right-0 z-40 mx-auto w-full max-w-[440px] px-3 pb-[calc(env(safe-area-inset-bottom)+4px)]">
                  <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/70 bg-white/85 p-1 shadow-soft backdrop-blur">
                    <button
                      type="button"
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                        mobilePanel === "modules"
                          ? "bg-primary text-white shadow-glow"
                          : "text-gray-700 hover:bg-white/70",
                      )}
                      onClick={() => setMobilePanel("modules")}
                    >
                      Modules
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                        mobilePanel === "canvas"
                          ? "bg-primary text-white shadow-glow"
                          : "text-gray-700 hover:bg-white/70",
                      )}
                      onClick={() => setMobilePanel("canvas")}
                    >
                      Canvas
                    </button>
                    <button
                      type="button"
                      disabled={!builder.selectedBlock}
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60",
                        mobilePanel === "inspector"
                          ? "bg-primary text-white shadow-glow"
                          : "text-gray-700 hover:bg-white/70",
                      )}
                      onClick={() => setMobilePanel("inspector")}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop */}
              <div
                className={cn(
                  "hidden lg:grid lg:flex-1 lg:min-h-0 lg:gap-5",
                  modulesOpen && inspectorOpen
                    ? "lg:grid-cols-[320px_minmax(0,1fr)_320px]"
                    : modulesOpen
                      ? "lg:grid-cols-[320px_minmax(0,1fr)]"
                      : inspectorOpen
                        ? "lg:grid-cols-[minmax(0,1fr)_320px]"
                        : "lg:grid-cols-1",
                )}
              >
                {modulesOpen ? <SpaceModulesPanel modules={SPACE_MODULES} onAddModule={addModule} /> : null}

                <SpaceBuilderCanvas
                  blocks={builder.visibleBlocks}
                  handle={spaceHandle ?? "me"}
                  walletLabel={walletLabel}
                  mode={builder.mode}
                  selectedId={builder.selectedId}
                  onSelectId={(id) => {
                    builder.setSelectedId(id);
                    setInspectorOpen(true);
                  }}
                  onDuplicateSelected={builder.duplicateSelectedBlock}
                  onToggleVisibilitySelected={onToggleVisibilitySelected}
                  onDeleteSelected={builder.deleteSelectedBlock}
                  onLayoutChange={builder.onLayoutChange}
                  onDropModule={addModule}
                />

                {inspectorOpen ? (
                  <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-soft backdrop-blur">
                    {builder.selectedBlock ? (
                      <SpaceInspector
                        block={builder.selectedBlock}
                        onChange={builder.updateBlock}
                        onDelete={builder.deleteSelectedBlock}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                        Select a module to edit its content.
                      </div>
                    )}
                  </aside>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
