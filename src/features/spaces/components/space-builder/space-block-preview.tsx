import { Link as LinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { SpaceBlock, SpaceLink } from "@/features/spaces/lib/space-document";

export const SpaceBlockPreview = ({ block }: { block: SpaceBlock }) => {
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
          {description ? <div className="text-xs text-muted-foreground">{description}</div> : null}
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
        <div
          className={cn(
            "h-full rounded-2xl text-white shadow-lg flex flex-col items-center justify-center text-center bg-gradient-to-br",
            toneClass,
          )}
        >
          <div className="text-2xl font-extrabold tracking-tight">{block.data.value}</div>
          <div className="mt-1 text-xs font-semibold text-white/85">{block.data.label}</div>
        </div>
      );
    }
    default:
      return null;
  }
};

