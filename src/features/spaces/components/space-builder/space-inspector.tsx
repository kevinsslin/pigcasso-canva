import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { getSpaceModuleDefinition } from "@/features/spaces/lib/space-modules";
import type { SpaceBlock, SpaceLink } from "@/features/spaces/lib/space-document";

type InspectorProps = {
  block: SpaceBlock;
  onChange: (next: SpaceBlock) => void;
  onDelete: () => void;
};

const BioInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "bio" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
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
  );
};

const LinksInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "links" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
    <div className="space-y-4">
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
  );
};

const ImageInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "image" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
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
  );
};

const TextInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "text" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
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
  );
};

const StatInspectorFields = ({
  block,
  onChange,
}: {
  block: Extract<SpaceBlock, { type: "stat" }>;
  onChange: InspectorProps["onChange"];
}) => {
  return (
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
  );
};

export const SpaceInspector = ({ block, onChange, onDelete }: InspectorProps) => {
  const moduleDefinition = getSpaceModuleDefinition(block.type);

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

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content</div>

            {block.type === "bio" ? (
              <BioInspectorFields block={block} onChange={onChange} />
            ) : block.type === "links" ? (
              <LinksInspectorFields block={block} onChange={onChange} />
            ) : block.type === "image" ? (
              <ImageInspectorFields block={block} onChange={onChange} />
            ) : block.type === "text" ? (
              <TextInspectorFields block={block} onChange={onChange} />
            ) : block.type === "stat" ? (
              <StatInspectorFields block={block} onChange={onChange} />
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
