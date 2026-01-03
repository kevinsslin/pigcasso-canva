import { useEffect, useRef, useState } from "react";
import { Loader, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { getSpaceModuleDefinition } from "@/features/spaces/lib/space-modules";
import type { SpaceBlock, SpaceLink } from "@/features/spaces/lib/space-document";
import { useMe } from "@/features/auth/api/use-me";
import { getAuthToken } from "@/lib/auth-token";
import { uploadFiles } from "@/lib/uploadthing";
import { getUploadthingErrorMessage } from "@/lib/uploadthing-errors";

type InspectorProps = {
  block: SpaceBlock;
  onChange: (next: SpaceBlock) => void;
  onDelete: () => void;
};

const UploadImageField = ({
  label,
  description,
  value,
  onChange,
  uploadthingConfigured,
  slug,
  maxBytes,
  maxFileSizeLabel,
  toastId,
}: {
  label: string;
  description?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  uploadthingConfigured: boolean | undefined;
  slug: "avatarUploader" | "imageUploader";
  maxBytes: number;
  maxFileSizeLabel: string;
  toastId: string;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      uploadAbortRef.current?.abort();
      uploadAbortRef.current = null;

      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
    };
  }, []);

  const onUpload = async (file: File) => {
    if (uploadthingConfigured !== true) {
      toast.error("Uploads are currently unavailable.");
      return;
    }

    if (file.size > maxBytes) {
      toast.error(`File is too large. Max size is ${maxFileSizeLabel}.`);
      return;
    }

    uploadAbortRef.current?.abort();

    const abortController = new AbortController();
    uploadAbortRef.current = abortController;

    setUploading(true);
    toast.loading("Uploading image…", { id: toastId, duration: Infinity });

    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
    }
    uploadTimeoutRef.current = setTimeout(() => {
      abortController.abort();
      toast.error("Upload is taking longer than expected. Please try again.", { id: toastId, duration: 4000 });
      setUploading(false);
      uploadTimeoutRef.current = null;
    }, 60_000);

    try {
      const token = await getAuthToken({
        maxWaitMs: 2000,
        retries: 4,
        retryDelayMs: 200,
      });

      if (!token) {
        throw new Error("Missing auth token. Please sign in again.");
      }

      const uploaded = await uploadFiles(slug, {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
      });

      const url =
        uploaded?.[0]?.ufsUrl ??
        uploaded?.[0]?.url ??
        (uploaded?.[0] as { serverData?: { url?: string } } | undefined)?.serverData?.url;

      if (!url) {
        throw new Error("Upload finished but no URL was returned.");
      }

      onChange(url);
      toast.success("Upload complete.", { id: toastId, duration: 3000 });
    } catch (err) {
      if (abortController.signal.aborted) {
        return;
      }
      toast.error(getUploadthingErrorMessage(err, { maxFileSizeLabel }), { id: toastId, duration: 4000 });
    } finally {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      uploadAbortRef.current = null;
      setUploading(false);
    }
  };

  const uploadEnabled = uploadthingConfigured === true && !uploading;

  const helperText =
    uploadthingConfigured === undefined
      ? "Checking upload configuration…"
      : uploadthingConfigured
        ? description ?? `PNG/JPG up to ${maxFileSizeLabel}.`
        : "Uploads are currently unavailable.";

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {value ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-red-500 hover:text-red-600"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <X className="mr-1 size-4" />
            Remove
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="size-14 overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-sm">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/10 via-cyan-400/10 to-yellow-300/10" />
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void onUpload(file);
          }}
        />

        <Button
          type="button"
          variant="secondary"
          className="text-sm font-medium"
          disabled={!uploadEnabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader className="mr-2 size-4 animate-spin" /> : <UploadCloud className="mr-2 size-4" />}
          {value ? "Replace" : "Upload"}
        </Button>
      </div>

      <div className="text-[11px] text-muted-foreground">{helperText}</div>
    </div>
  );
};

const BioInspectorFields = ({
  block,
  onChange,
  uploadthingConfigured,
}: {
  block: Extract<SpaceBlock, { type: "bio" }>;
  onChange: InspectorProps["onChange"];
  uploadthingConfigured: boolean | undefined;
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
        <UploadImageField
          label="Avatar image"
          value={block.data.avatarUrl ?? null}
          onChange={(url) => onChange({ ...block, data: { ...block.data, avatarUrl: url } })}
          uploadthingConfigured={uploadthingConfigured}
          slug="avatarUploader"
          maxBytes={8 * 1024 * 1024}
          maxFileSizeLabel="8MB"
          toastId="pigcasso:space:upload-avatar"
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
  uploadthingConfigured,
}: {
  block: Extract<SpaceBlock, { type: "image" }>;
  onChange: InspectorProps["onChange"];
  uploadthingConfigured: boolean | undefined;
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
        <UploadImageField
          label="Image"
          value={block.data.imageUrl ?? null}
          onChange={(url) => onChange({ ...block, data: { ...block.data, imageUrl: url } })}
          uploadthingConfigured={uploadthingConfigured}
          slug="imageUploader"
          maxBytes={4 * 1024 * 1024}
          maxFileSizeLabel="4MB"
          toastId="pigcasso:space:upload-image"
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
  const me = useMe();
  const uploadthingConfigured = me.data?.data.integrations?.uploadthing.configured;

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
              <BioInspectorFields block={block} onChange={onChange} uploadthingConfigured={uploadthingConfigured} />
            ) : block.type === "links" ? (
              <LinksInspectorFields block={block} onChange={onChange} />
            ) : block.type === "image" ? (
              <ImageInspectorFields block={block} onChange={onChange} uploadthingConfigured={uploadthingConfigured} />
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
