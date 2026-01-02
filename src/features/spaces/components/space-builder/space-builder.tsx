"use client";

import { Card } from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { SpaceBuilderHeader } from "@/features/spaces/components/space-builder/space-builder-header";
import { SpaceBuilderCanvas } from "@/features/spaces/components/space-builder/space-builder-canvas";
import { SpaceInspector } from "@/features/spaces/components/space-builder/space-inspector";
import { SpaceModulesPanel } from "@/features/spaces/components/space-builder/space-modules-panel";
import { useSpaceBuilder } from "@/features/spaces/hooks/use-space-builder";
import { SPACE_MODULES } from "@/features/spaces/lib/space-modules";

export const SpaceBuilder = () => {
  const builder = useSpaceBuilder();

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
    <div className="relative min-h-screen bg-[#fff7fb]">
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
      />

      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <SpaceModulesPanel
            modules={SPACE_MODULES}
            onAddModule={builder.addModule}
          />

          <main className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur shadow-soft p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="min-w-0">
                <div className="text-lg font-extrabold tracking-tight text-gray-900">My Space</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {builder.isPublished ? "Published" : "Draft"} • /space/&lt;your-handle&gt;
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
                <span className={cn("size-2 rounded-full", savingDotClass)} />
                <span className="text-xs font-semibold text-gray-700">{savingLabel}</span>
              </div>
            </div>

            <SpaceBuilderCanvas
              blocks={builder.visibleBlocks}
              mode={builder.mode}
              selectedId={builder.selectedId}
              onSelectId={builder.setSelectedId}
              onLayoutChange={builder.onLayoutChange}
            />
          </main>

          <aside className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-soft overflow-hidden">
            {builder.selectedBlock && builder.mode === "edit" ? (
              <SpaceInspector
                block={builder.selectedBlock}
                onChange={builder.updateBlock}
                onDelete={builder.deleteSelectedBlock}
              />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                {builder.mode === "preview"
                  ? "Preview mode. Switch back to Edit to change modules."
                  : "Select a module to edit its content."}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
