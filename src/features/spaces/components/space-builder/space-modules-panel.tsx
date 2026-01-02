import { ScrollArea } from "@/components/ui/scroll-area";

import type { SpaceModuleDefinition } from "@/features/spaces/lib/space-modules";

type SpaceModulesPanelProps = {
  modules: SpaceModuleDefinition[];
  onAddModule: (module: SpaceModuleDefinition) => void;
};

export const SpaceModulesPanel = ({ modules, onAddModule }: SpaceModulesPanelProps) => {
  return (
    <aside className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-soft overflow-hidden">
      <div className="border-b border-white/60 px-4 py-4">
        <div className="text-sm font-bold text-gray-900">Modules</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Add blocks, then drag to arrange on the canvas.
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-240px)]">
        <div className="p-4 grid grid-cols-2 gap-3">
          {modules.map((module) => (
            <button
              key={module.type}
              type="button"
              onClick={() => onAddModule(module)}
              className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 px-3 py-3 text-left shadow-soft transition hover:border-cyan-200 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6">
                  <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/55 to-white/0 motion-safe:animate-[pigcasso-sheen_5.5s_ease-in-out_0ms_infinite]" />
                </div>
              </div>
              <module.icon className="size-5 text-primary group-hover:text-cyan-500 transition-colors" />
              <div className="mt-2 text-xs font-bold text-gray-900">{module.label}</div>
              <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{module.description}</div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
};

