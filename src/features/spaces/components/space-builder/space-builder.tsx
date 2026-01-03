"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { SpaceBuilderHeader } from "@/features/spaces/components/space-builder/space-builder-header";
import { SpaceBuilderCanvas } from "@/features/spaces/components/space-builder/space-builder-canvas";
import { SpaceInspector } from "@/features/spaces/components/space-builder/space-inspector";
import { SpaceModulesPanel } from "@/features/spaces/components/space-builder/space-modules-panel";
import { useSpaceBuilder, type SpaceBuilderController } from "@/features/spaces/hooks/use-space-builder";
import { SPACE_MODULES } from "@/features/spaces/lib/space-modules";
import { useMe } from "@/features/auth/api/use-me";
import { getCanonicalSpaceHandle } from "@/features/spaces/lib/space-handle";
import { shortenWalletAddress } from "@/features/auth/lib/user-display";
import { BentoSpacePage } from "@/features/spaces/components/space-public/bento-space-page";

export const SpaceBuilder = () => {
  const builder = useSpaceBuilder();
  const me = useMe();
  const [mobilePanel, setMobilePanel] = useState<"canvas" | "modules" | "inspector">("canvas");
  const [modulesOpen, setModulesOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { mode, selectedId, deleteSelectedBlock } = builder;

  const spaceHandle = me.data?.data.user
    ? getCanonicalSpaceHandle({ id: me.data.data.user.id, socials: me.data.data.user.socials })
    : null;
  const spacePath = spaceHandle ? `/space/${encodeURIComponent(spaceHandle)}` : null;

  const walletAddress = me.data?.data.user.wallets.external ?? me.data?.data.user.wallets.embedded ?? null;
  const walletLabel = walletAddress ? shortenWalletAddress(walletAddress) : null;

  const savingLabel =
    builder.saveStatus === "saving"
      ? "Saving…"
      : builder.saveStatus === "dirty"
        ? "Unsaved changes"
        : "Saved";

  const savingDotClass =
    builder.saveStatus === "saving"
      ? "bg-yellow-400"
      : builder.saveStatus === "dirty"
        ? "bg-red-400"
        : "bg-emerald-400";

  const addModule: SpaceBuilderController["addModule"] = (module, placement) => {
    builder.addModule(module, placement);
    setMobilePanel("canvas");
  };

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

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-primary/18 blur-3xl motion-safe:animate-[pigcasso-drift_18s_ease-in-out_infinite]" />
        <div className="absolute top-[35%] left-[-12rem] h-[30rem] w-[30rem] rounded-full bg-cyan-400/14 blur-3xl motion-safe:animate-[pigcasso-float_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-14rem] right-[20%] h-[32rem] w-[32rem] rounded-full bg-yellow-300/12 blur-3xl motion-safe:animate-[pigcasso-drift_22s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,rgba(236,72,153,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <SpaceBuilderHeader
        mode={builder.mode}
        onModeChange={builder.setMode}
        onPublish={builder.publish}
        publishDisabled={builder.isSaving}
        isPublished={builder.isPublished}
        spacePath={spacePath}
        modulesOpen={modulesOpen}
        inspectorOpen={inspectorOpen}
        onToggleModules={() => setModulesOpen((prev) => !prev)}
        onToggleInspector={() => setInspectorOpen((prev) => !prev)}
      />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto flex h-full max-w-[1400px] flex-col px-4 pb-8 pt-6 sm:px-6">
          {builder.mode === "preview" ? (
            <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/40 shadow-soft backdrop-blur">
              <div className="shrink-0 border-b border-white/60 bg-white/70 px-5 py-4">
                <div className="text-sm font-extrabold tracking-tight text-gray-900">Preview</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  This matches what visitors see at{" "}
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
                  variant="embedded"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="flex flex-1 min-h-0 flex-col gap-4 lg:hidden">
                <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-soft backdrop-blur">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold tracking-tight text-gray-900">My Space</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {builder.isPublished ? "Published" : "Draft"} • {spacePath ?? "/space/<your-handle>"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
                      <span className={cn("size-2 rounded-full", savingDotClass)} />
                      <span className="text-xs font-semibold text-gray-700">{savingLabel}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/70 bg-white/70 p-1 shadow-sm">
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
                    <div className="h-full rounded-2xl border border-white/60 bg-white/40 p-4 shadow-soft backdrop-blur">
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
                        onLayoutChange={builder.onLayoutChange}
                        onDropModule={addModule}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop */}
              <div
                className={cn(
                  "hidden lg:grid lg:flex-1 lg:min-h-0 lg:gap-5",
                  modulesOpen && inspectorOpen
                    ? "lg:grid-cols-[300px_minmax(0,1fr)_300px]"
                    : modulesOpen
                      ? "lg:grid-cols-[300px_minmax(0,1fr)]"
                      : inspectorOpen
                        ? "lg:grid-cols-[minmax(0,1fr)_300px]"
                        : "lg:grid-cols-1",
                )}
              >
                {modulesOpen ? <SpaceModulesPanel modules={SPACE_MODULES} onAddModule={addModule} /> : null}

                <main className="flex h-full min-h-0 flex-col rounded-2xl border border-white/60 bg-white/40 p-4 shadow-soft backdrop-blur sm:p-5">
                  <div className="flex items-end justify-between gap-3 pb-4">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold tracking-tight text-gray-900">My Space</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {builder.isPublished ? "Published" : "Draft"} • {spacePath ?? "/space/<your-handle>"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
                      <span className={cn("size-2 rounded-full", savingDotClass)} />
                      <span className="text-xs font-semibold text-gray-700">{savingLabel}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
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
                      onLayoutChange={builder.onLayoutChange}
                      onDropModule={addModule}
                    />
                  </div>
                </main>

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
