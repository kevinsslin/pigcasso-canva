import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

import type { SpaceBlock } from "@/features/spaces/lib/space-document";

export const SpaceBlockCard = ({
  block,
  handle,
  walletLabel,
  interactive = true,
}: {
  block: SpaceBlock;
  handle: string;
  walletLabel: string | null;
  interactive?: boolean;
}) => {
  const cardBase = cn(
    "group relative h-full w-full overflow-hidden rounded-3xl bg-white/85 shadow-soft ring-1 ring-black/5 backdrop-blur",
    interactive
      ? "transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-glow"
      : null,
  );

  switch (block.type) {
    case "bio": {
      const avatarUrl = block.data.avatarUrl ?? null;
      return (
        <div className={cn(cardBase, "px-5 py-5")}>
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/12 via-cyan-400/10 to-yellow-300/10" />
          </div>
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary via-cyan-400 to-yellow-300 p-0.5 shadow-soft">
                  <div className="h-full w-full overflow-hidden rounded-[1rem] bg-white">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xl font-extrabold tracking-tight text-gray-900">
                    {block.data.displayName}
                  </div>
                  {block.data.subtitle ? (
                    <div className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                      {block.data.subtitle}
                    </div>
                  ) : null}
                </div>
              </div>
              {block.data.statusLabel ? (
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
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
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                {block.data.bio}
              </p>
            ) : null}
          </div>
        </div>
      );
    }
    case "links": {
      return (
        <div className={cn(cardBase, "px-5 py-5")}>
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-cyan-400/10 to-yellow-300/10" />
          </div>
          <div className="relative">
            <div className="text-sm font-extrabold text-gray-900">{block.data.title}</div>
            {block.data.description ? (
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {block.data.description}
              </div>
            ) : null}
            <div className="mt-4 space-y-2">
              {block.data.links.map((link) => {
                const rowClassName =
                  "flex w-full items-center justify-between rounded-2xl bg-white/75 px-4 py-2.5 text-sm font-semibold text-gray-900 ring-1 ring-black/5 transition-colors";

                if (interactive) {
                  return (
                    <a
                      key={`${link.label}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(rowClassName, "hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30")}
                    >
                      <span className="truncate">{link.label}</span>
                      <span className="text-xs text-muted-foreground">↗</span>
                    </a>
                  );
                }

                return (
                  <div key={`${link.label}-${link.url}`} className={rowClassName}>
                    <span className="truncate">{link.label}</span>
                    <span className="text-xs text-muted-foreground">↗</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    case "image": {
      return (
        <div className={cn(cardBase, "p-0")}>
          <div className="relative h-full w-full">
            {block.data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.data.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]" />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
            {block.data.title ? (
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/85 px-3 py-2 text-xs font-semibold text-gray-900 shadow-soft backdrop-blur">
                <div className="line-clamp-2">{block.data.title}</div>
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    case "text": {
      return (
        <div className={cn(cardBase, "px-5 py-5")}>
          <div className="text-sm font-extrabold text-gray-900">{block.data.title}</div>
          <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-muted-foreground">
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
        <div
          className={cn(
            "h-full rounded-3xl text-white shadow-lg flex flex-col items-center justify-center text-center bg-gradient-to-br ring-1 ring-black/10",
            interactive ? "transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-glow" : null,
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
