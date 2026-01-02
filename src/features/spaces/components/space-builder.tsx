"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";
import { toast } from "sonner";
import {
  Eye,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Rocket,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import type { Layout } from "react-grid-layout";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { useMySpaceDocument } from "@/features/spaces/api/use-my-space-document";
import { useUpdateMySpaceDocument } from "@/features/spaces/api/use-update-my-space-document";
import type { SpaceGridLayoutProps } from "@/features/spaces/components/space-grid-layout";
import {
  spaceDocumentSchema,
  type SpaceBlock,
  type SpaceBlock as SpaceBlockType,
  type SpaceDocument,
  type SpaceLink,
} from "@/features/spaces/lib/space-document";

const SpaceGridLayout = dynamic<SpaceGridLayoutProps>(
  () => import("@/features/spaces/components/space-grid-layout").then((mod) => mod.SpaceGridLayout),
  { ssr: false },
);

type BuilderMode = "edit" | "preview";

type ModuleDefinition = {
  type: SpaceBlock["type"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultLayout: { w: number; h: number };
  createData: () => SpaceBlock["data"];
};

const MODULES: ModuleDefinition[] = [
  {
    type: "bio",
    label: "Bio card",
    description: "Hero identity card.",
    icon: UserRound,
    defaultLayout: { w: 2, h: 2 },
    createData: () => ({
      displayName: "Pigcasso Creator",
      subtitle: "Web3 Builder",
      bio: "A public gateway page powered by Pigcasso.",
      avatarUrl: null,
      statusLabel: "Available",
    }),
  },
  {
    type: "links",
    label: "Link stack",
    description: "Buttons to your links.",
    icon: LinkIcon,
    defaultLayout: { w: 2, h: 1 },
    createData: () => ({
      title: "Links",
      description: null,
      links: [
        { label: "X", url: "https://x.com/" },
        { label: "Website", url: "https://example.com" },
      ],
    }),
  },
  {
    type: "image",
    label: "Image",
    description: "Photo / banner.",
    icon: ImageIcon,
    defaultLayout: { w: 1, h: 1 },
    createData: () => ({
      title: null,
      imageUrl: null,
    }),
  },
  {
    type: "text",
    label: "Text",
    description: "A short paragraph.",
    icon: FileText,
    defaultLayout: { w: 1, h: 1 },
    createData: () => ({
      title: "Note",
      body: "Write something about yourself.",
    }),
  },
  {
    type: "stat",
    label: "Stat",
    description: "A single metric.",
    icon: Wallet,
    defaultLayout: { w: 1, h: 1 },
    createData: () => ({
      label: "Followers",
      value: "0",
      tone: "secondary",
    }),
  },
];

const getModuleDefinition = (type: SpaceBlock["type"]) => MODULES.find((module) => module.type === type);

const layoutFromBlocks = (blocks: SpaceBlock[]): Layout =>
  blocks.map((block) => ({
    i: block.id,
    x: block.layout.x,
    y: block.layout.y,
    w: block.layout.w,
    h: block.layout.h,
  }));

const applyLayoutToBlocks = (blocks: SpaceBlock[], layout: Layout) => {
  const byId = new Map(layout.map((item) => [item.i, item]));
  return blocks.map((block) => {
    const next = byId.get(block.id);
    if (!next) return block;
    return {
      ...block,
      layout: { ...block.layout, x: next.x, y: next.y, w: next.w, h: next.h },
    };
  });
};

const SpaceBlockPreview = ({ block }: { block: SpaceBlockType }) => {
  switch (block.type) {
    case "bio": {
      const subtitle = block.data.subtitle ?? null;
      const bio = block.data.bio ?? null;
      const avatarUrl = block.data.avatarUrl ?? null;
      const statusLabel = block.data.statusLabel ?? null;
      return (
        <div className="h-full rounded-2xl border border-border bg-card/80 backdrop-blur p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-14 rounded-xl bg-gradient-to-br from-primary via-cyan-400 to-yellow-300 p-0.5">
                <div className="h-full w-full overflow-hidden rounded-[0.7rem] bg-white">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-extrabold tracking-tight text-gray-900">
                  {block.data.displayName}
                </div>
                {subtitle ? (
                  <div className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</div>
                ) : null}
              </div>
            </div>
            {statusLabel ? (
              <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {statusLabel}
              </span>
            ) : null}
          </div>
          {bio ? <div className="text-sm text-muted-foreground leading-relaxed">{bio}</div> : null}
        </div>
      );
    }
    case "links": {
      const description = block.data.description ?? null;
      const links = (block.data.links ?? []) as SpaceLink[];
      return (
        <div className="h-full rounded-2xl border border-border bg-card/80 backdrop-blur p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-bold text-gray-900">{block.data.title}</div>
            <LinkIcon className="size-4 text-muted-foreground" />
          </div>
          {description ? (
            <div className="text-xs text-muted-foreground">{description}</div>
          ) : null}
          <div className="mt-auto space-y-2">
            {links.slice(0, 4).map((link) => (
              <div
                key={link.url}
                className="rounded-xl border border-border/70 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-900 truncate"
              >
                {link.label}
              </div>
            ))}
            {links.length > 4 ? (
              <div className="text-[11px] text-muted-foreground">+{links.length - 4} more</div>
            ) : null}
          </div>
        </div>
      );
    }
    case "image": {
      const title = block.data.title ?? null;
      const imageUrl = block.data.imageUrl ?? null;
      return (
        <div className="h-full rounded-2xl border border-border bg-card/80 backdrop-blur overflow-hidden">
          <div className="relative h-full w-full bg-muted">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                Upload an image
              </div>
            )}
            {title ? (
              <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-gray-900">
                {title}
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    case "text": {
      return (
        <div className="h-full rounded-2xl border border-border bg-card/80 backdrop-blur p-5 flex flex-col gap-2">
          <div className="text-sm font-bold text-gray-900">{block.data.title}</div>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
            {block.data.body}
          </div>
        </div>
      );
    }
    case "stat": {
      const tone = block.data.tone ?? "secondary";
      const toneClass =
        tone === "primary"
          ? "from-primary to-purple-600 shadow-pink-500/20"
          : tone === "accent"
            ? "from-yellow-400 to-orange-500 shadow-yellow-500/20"
            : "from-cyan-400 to-blue-600 shadow-cyan-500/20";
      return (
        <div className={cn("h-full rounded-2xl text-white shadow-lg flex flex-col items-center justify-center text-center bg-gradient-to-br", toneClass)}>
          <div className="text-2xl font-extrabold tracking-tight">{block.data.value}</div>
          <div className="mt-1 text-xs font-semibold text-white/85">{block.data.label}</div>
        </div>
      );
    }
    default:
      return null;
  }
};

type InspectorProps = {
  block: SpaceBlock;
  onChange: (next: SpaceBlock) => void;
  onDelete: () => void;
};

const SpaceInspector = ({ block, onChange, onDelete }: InspectorProps) => {
  const moduleDefinition = getModuleDefinition(block.type);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Editing
            </div>
            <div className="mt-1 flex items-center gap-2">
              {moduleDefinition ? <moduleDefinition.icon className="size-4 text-primary" /> : null}
              <div className="text-base font-bold text-gray-900 truncate">
                {moduleDefinition?.label ?? block.type}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={onDelete}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Module visibility</div>
                <div className="text-xs text-muted-foreground">Show this module on your public Space.</div>
              </div>
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  block.isVisible ? "bg-primary" : "bg-muted",
                )}
                onClick={() => onChange({ ...block, isVisible: !block.isVisible })}
              >
                <span
                  className={cn(
                    "inline-block size-4 transform rounded-full bg-white transition-transform",
                    block.isVisible ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </Card>

          {block.type === "bio" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Display name</div>
                    <Input
                      value={block.data.displayName}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, displayName: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Subtitle</div>
                    <Input
                      value={block.data.subtitle ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, subtitle: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Bio</div>
                    <Textarea
                      value={block.data.bio ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, bio: e.target.value } })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Avatar URL</div>
                    <Input
                      value={block.data.avatarUrl ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, avatarUrl: e.target.value } })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Status badge</div>
                    <Input
                      value={block.data.statusLabel ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, statusLabel: e.target.value } })}
                      placeholder="Available"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {block.type === "links" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Title</div>
                    <Input
                      value={block.data.title}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Description</div>
                    <Input
                      value={block.data.description ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, description: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Links</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const nextLinks = [...(block.data.links as SpaceLink[]), { label: "New link", url: "https://example.com" }];
                      onChange({ ...block, data: { ...block.data, links: nextLinks } });
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Add
                  </Button>
                </div>

                <div className="space-y-3">
                  {(block.data.links as SpaceLink[]).map((link, index) => (
                    <Card key={`${link.url}-${index}`} className="p-3">
                      <div className="grid gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[11px] font-medium text-muted-foreground">Label</div>
                            <Input
                              value={link.label}
                              onChange={(e) => {
                                const next = [...(block.data.links as SpaceLink[])];
                                next[index] = { ...next[index], label: e.target.value };
                                onChange({ ...block, data: { ...block.data, links: next } });
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-muted-foreground">URL</div>
                            <Input
                              value={link.url}
                              onChange={(e) => {
                                const next = [...(block.data.links as SpaceLink[])];
                                next[index] = { ...next[index], url: e.target.value };
                                onChange({ ...block, data: { ...block.data, links: next } });
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="justify-start text-red-500 hover:text-red-600"
                          onClick={() => {
                            const next = [...(block.data.links as SpaceLink[])];
                            next.splice(index, 1);
                            onChange({ ...block, data: { ...block.data, links: next } });
                          }}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {block.type === "image" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Title</div>
                    <Input
                      value={block.data.title ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Image URL</div>
                    <Input
                      value={block.data.imageUrl ?? ""}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, imageUrl: e.target.value } })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {block.type === "text" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Title</div>
                    <Input
                      value={block.data.title}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Body</div>
                    <Textarea
                      value={block.data.body}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, body: e.target.value } })}
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {block.type === "stat" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Label</div>
                    <Input
                      value={block.data.label}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, label: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Value</div>
                    <Input
                      value={block.data.value}
                      onChange={(e) => onChange({ ...block, data: { ...block.data, value: e.target.value } })}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Tone</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["secondary", "primary", "accent"] as const).map((tone) => (
                        <Button
                          key={tone}
                          type="button"
                          variant={block.data.tone === tone ? "default" : "secondary"}
                          size="sm"
                          onClick={() => onChange({ ...block, data: { ...block.data, tone } })}
                        >
                          {tone}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
};

export const SpaceBuilder = () => {
  const { data, isLoading, error } = useMySpaceDocument();
  const saveMutation = useUpdateMySpaceDocument();

  const hydratedRef = useRef(false);
  const [mode, setMode] = useState<BuilderMode>("edit");
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

  const updateSelectedBlock = (nextBlock: SpaceBlock) => {
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

  const addModule = (module: ModuleDefinition) => {
    if (!document) return;
    const nextRow = document.blocks.reduce((maxY, block) => {
      return Math.max(maxY, block.layout.y + block.layout.h);
    }, 0);

    const block: SpaceBlock = {
      id: crypto.randomUUID(),
      type: module.type,
      isVisible: true,
      layout: { x: 0, y: nextRow, w: module.defaultLayout.w, h: module.defaultLayout.h },
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

  const selectedBlock = document?.blocks.find((block) => block.id === selectedId) ?? null;

  const savingLabel = saveMutation.isPending ? "Saving…" : isDirty ? "Unsaved changes" : "Saved";
  const savingDotClass = saveMutation.isPending ? "bg-yellow-400" : isDirty ? "bg-red-400" : "bg-emerald-400";

  if (isLoading || !document) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
        Loading Space Builder…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Card className="max-w-md p-6 text-sm">
          <div className="font-bold text-gray-900">Failed to load Space</div>
          <div className="mt-2 text-muted-foreground">{error.message}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#fff7fb]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-primary/18 blur-3xl motion-safe:animate-[pigcasso-drift_18s_ease-in-out_infinite]" />
        <div className="absolute top-[35%] left-[-12rem] h-[30rem] w-[30rem] rounded-full bg-cyan-400/14 blur-3xl motion-safe:animate-[pigcasso-float_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-14rem] right-[20%] h-[32rem] w-[32rem] rounded-full bg-yellow-300/12 blur-3xl motion-safe:animate-[pigcasso-drift_22s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,rgba(236,72,153,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-cyan-400 flex items-center justify-center overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-pig.png" alt="Pigcasso" className="h-9 w-9 object-cover" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-tight text-gray-900">
                Pigcasso Space Builder
              </div>
              <div className="text-xs text-muted-foreground">
                Your Bento-style public gateway page
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-white/70 p-1 border border-white/60 shadow-soft">
              <Button
                type="button"
                variant={mode === "edit" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("edit")}
                className={cn("rounded-full", mode === "edit" ? "" : "text-muted-foreground")}
              >
                <GripVertical className="mr-2 size-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant={mode === "preview" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("preview")}
                className={cn("rounded-full", mode === "preview" ? "" : "text-muted-foreground")}
              >
                <Eye className="mr-2 size-4" />
                Preview
              </Button>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (!document) return;
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
              }}
              disabled={saveMutation.isPending}
              className="rounded-2xl bg-primary text-white shadow-glow hover:opacity-95"
            >
              <Rocket className="mr-2 size-4" />
              Publish
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-soft overflow-hidden">
            <div className="border-b border-white/60 px-4 py-4">
              <div className="text-sm font-bold text-gray-900">Modules</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Add blocks, then drag to arrange on the canvas.
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="p-4 grid grid-cols-2 gap-3">
                {MODULES.map((module) => (
                  <button
                    key={module.type}
                    type="button"
                    onClick={() => addModule(module)}
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

          <main className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur shadow-soft p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3 pb-4">
              <div className="min-w-0">
                <div className="text-lg font-extrabold tracking-tight text-gray-900">My Space</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {isPublished ? "Published" : "Draft"} • /space/&lt;your-handle&gt;
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
                <span className={cn("size-2 rounded-full", savingDotClass)} />
                <span className="text-xs font-semibold text-gray-700">{savingLabel}</span>
              </div>
            </div>

            <div className="relative rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle,rgba(236,72,153,0.12)_1px,transparent_1px)] [background-size:40px_40px]" />
              <div className="relative overflow-x-auto overscroll-x-contain pb-2">
                <div className="min-w-[820px]">
                  <SpaceGridLayout
                    className="space-grid-layout"
                    cols={4}
                    rowHeight={140}
                    margin={[16, 16]}
                    containerPadding={[0, 0]}
                    draggableHandle=".space-drag-handle"
                    isDraggable={mode === "edit"}
                    isResizable={mode === "edit"}
                    onLayoutChange={onLayoutChange}
                    layout={layoutFromBlocks(document.blocks.filter((block) => block.isVisible || mode === "edit"))}
                  >
                {document.blocks
                  .filter((block) => block.isVisible || mode === "edit")
                  .map((block) => {
                    const isSelected = selectedId === block.id && mode === "edit";

                    return (
                      <div key={block.id} className="h-full">
                        <div
                          className={cn(
                            "group h-full relative rounded-2xl ring-1 ring-black/5 transition-shadow duration-200",
                            isSelected ? "ring-2 ring-primary/50 shadow-neon" : "hover:shadow-glow",
                          )}
                          onClick={() => {
                            if (mode !== "edit") return;
                            setSelectedId(block.id);
                          }}
                        >
                          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                            <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6">
                              <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/45 to-white/0 motion-safe:animate-[pigcasso-sheen_5.2s_ease-in-out_0ms_infinite]" />
                            </div>
                          </div>

                          {mode === "edit" ? (
                            <div
                              className={cn(
                                "space-drag-handle absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-white/60 bg-white/85 px-2 py-1 shadow-sm transition-opacity",
                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                              )}
                            >
                              <GripVertical className="size-4 text-muted-foreground" />
                            </div>
                          ) : null}

                          <SpaceBlockPreview block={block} />
                        </div>
                      </div>
                    );
                  })}
                  </SpaceGridLayout>
                </div>
              </div>
            </div>
          </main>

          <aside className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-soft overflow-hidden">
            {selectedBlock && mode === "edit" ? (
              <SpaceInspector
                block={selectedBlock}
                onChange={updateSelectedBlock}
                onDelete={deleteSelectedBlock}
              />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">
                {mode === "preview"
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
