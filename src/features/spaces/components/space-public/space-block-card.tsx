import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import type { SpaceBlock } from "@/features/spaces/lib/space-document";

export const SpaceBlockCard = ({
  block,
  handle,
  walletLabel,
}: {
  block: SpaceBlock;
  handle: string;
  walletLabel: string | null;
}) => {
  switch (block.type) {
    case "bio": {
      const avatarUrl = block.data.avatarUrl ?? null;
      return (
        <div className="h-full rounded-2xl border border-white/60 bg-white/80 px-5 py-5 shadow-soft">
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
                <div className="text-xl font-extrabold tracking-tight text-gray-900 truncate">
                  {block.data.displayName}
                </div>
                {block.data.subtitle ? (
                  <div className="mt-1 text-sm font-semibold text-muted-foreground truncate">
                    {block.data.subtitle}
                  </div>
                ) : null}
              </div>
            </div>
            {block.data.statusLabel ? (
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {block.data.statusLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-1 font-semibold">
              @{handle}
            </span>
            {walletLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/70 px-3 py-1 font-semibold">
                <Wallet className="size-3" />
                {walletLabel}
              </span>
            ) : null}
          </div>

          {block.data.bio ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-4">
              {block.data.bio}
            </p>
          ) : null}
        </div>
      );
    }
    case "links": {
      return (
        <div className="h-full rounded-2xl border border-white/60 bg-white/80 px-5 py-5 shadow-soft">
          <div className="text-sm font-extrabold text-gray-900">{block.data.title}</div>
          {block.data.description ? (
            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {block.data.description}
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {block.data.links.map((link) => (
              <Button
                key={`${link.label}-${link.url}`}
                asChild
                variant="secondary"
                className="w-full justify-between rounded-xl bg-white/70 border border-white/60 hover:bg-white"
              >
                <a href={link.url} target="_blank" rel="noreferrer">
                  <span className="truncate">{link.label}</span>
                  <span className="text-xs text-muted-foreground">↗</span>
                </a>
              </Button>
            ))}
          </div>
        </div>
      );
    }
    case "image": {
      return (
        <div className="h-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-soft">
          <div className="relative h-full w-full">
            {block.data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.data.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]" />
            )}
            {block.data.title ? (
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/80 px-3 py-2 text-xs font-semibold text-gray-900 backdrop-blur">
                {block.data.title}
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    case "text": {
      return (
        <div className="h-full rounded-2xl border border-white/60 bg-white/80 px-5 py-5 shadow-soft">
          <div className="text-sm font-extrabold text-gray-900">{block.data.title}</div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-6">
            {block.data.body}
          </p>
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

