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
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredModules.map((module) => (
            <button
              key={module.type}
              type="button"
              onClick={() => onAddModule(module)}
              draggable
              onDragStart={(event) => setSpaceModuleDragData(event.dataTransfer, module.type)}
              className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 px-3 py-3 text-left shadow-soft transition hover:border-cyan-200 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6">
                  <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/55 to-white/0 motion-safe:animate-[pigcasso-sheen_5.5s_ease-in-out_0ms_infinite]" />
                </div>
              </div>
              <div className="relative flex items-start justify-between gap-2">
                <module.icon className="size-5 text-primary group-hover:text-cyan-500 transition-colors" />
                <span className="rounded-md border border-white/60 bg-white/80 px-1.5 py-1 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="size-4 text-muted-foreground" />
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-gray-900">{module.label}</div>
              <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{module.description}</div>
            </button>
          ))}
          {filteredModules.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-white/70 bg-white/60 px-4 py-6 text-center text-xs text-muted-foreground">
              No modules found.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
};
