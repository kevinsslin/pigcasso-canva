"use client";

import { useMemo, useState } from "react";

import { GripVertical, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { setSpaceModuleDragData } from "@/features/spaces/lib/space-dnd";
import type { SpaceModuleDefinition } from "@/features/spaces/lib/space-modules";

type SpaceModulesPanelProps = {
  modules: SpaceModuleDefinition[];
  onAddModule: (module: SpaceModuleDefinition) => void;
};

export const SpaceModulesPanel = ({ modules, onAddModule }: SpaceModulesPanelProps) => {
  const [query, setQuery] = useState("");
  const filteredModules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return modules;

    return modules.filter((module) => {
      const label = module.label.toLowerCase();
      const description = module.description.toLowerCase();
      return label.includes(normalized) || description.includes(normalized);
    });
  }, [modules, query]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-soft backdrop-blur">
      <div className="border-b border-white/60 px-4 py-4 space-y-3">
        <div>
          <div className="text-sm font-bold text-gray-900">Modules</div>
          <div className="mt-1 text-xs text-muted-foreground">Drag onto the canvas or click to add.</div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules…"
            className="h-9 pl-9 bg-white/70"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredModules.map((module) => (
            <button
              key={module.type}
              type="button"
              onClick={() => onAddModule(module)}
              draggable
              onDragStart={(event) => setSpaceModuleDragData(event.dataTransfer, module.type)}
              className="group relative w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-left shadow-soft transition hover:border-primary/25 hover:bg-white/80 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-black/5 transition-colors group-hover:bg-cyan-400/10 group-hover:text-cyan-700">
                  <module.icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-bold text-gray-900">{module.label}</div>
                    <span className="rounded-xl border border-white/70 bg-white/80 px-2 py-1 text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="size-3" />
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{module.description}</div>
                </div>
              </div>
            </button>
          ))}
          {filteredModules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 px-4 py-6 text-center text-xs text-muted-foreground">
              No modules found.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
};
