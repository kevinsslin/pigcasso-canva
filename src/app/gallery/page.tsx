"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, Heart, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetGalleryCanvases } from "@/features/gallery/api/use-get-gallery-canvases";
import { useToggleGalleryBookmark } from "@/features/gallery/api/use-toggle-gallery-bookmark";
import { useToggleGalleryLike } from "@/features/gallery/api/use-toggle-gallery-like";
import { useOpenApp } from "@/features/marketing/hooks/use-open-app";

export default function GalleryPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { openApp, opening } = useOpenApp();
  const [sort, setSort] = useState<"new" | "top">("new");

  const canvases = useGetGalleryCanvases({ sort, limit: 24 });
  const toggleLike = useToggleGalleryLike();
  const toggleBookmark = useToggleGalleryBookmark();

  const items = useMemo(() => canvases.data?.pages.flatMap((page) => page.data) ?? [], [canvases.data]);

  const requireLogin = async () => {
    if (!ready) {
      toast.message("Loading…");
      return false;
    }
    if (authenticated) return true;
    await login();
    return true;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-9 rounded-full overflow-hidden border bg-white">
              <Image src="/logo-pig.png" alt="Pigcasso" width={36} height={36} className="h-full w-full object-cover" />
            </div>
            <div className="font-extrabold tracking-tight">Gallery</div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              onClick={() => void openApp("/app?new=1")}
              disabled={opening}
            >
              {opening ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
              Open app
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Published boards</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Explore how creators iterated — canvas + chat, fully view-only.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={sort === "new" ? "default" : "secondary"}
              className="rounded-full"
              onClick={() => setSort("new")}
              disabled={canvases.isFetching}
            >
              New
            </Button>
            <Button
              type="button"
              variant={sort === "top" ? "default" : "secondary"}
              className="rounded-full"
              onClick={() => setSort("top")}
              disabled={canvases.isFetching}
            >
              Top
            </Button>
          </div>
        </div>

        {canvases.isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : canvases.isError ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {canvases.error?.message || "Failed to load gallery."}
          </div>
        ) : items.length ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => {
                const publishedLabel = item.publishedAt
                  ? formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })
                  : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/gallery/${item.id}`)}
                    className="group rounded-2xl border bg-card p-4 text-left shadow-soft hover:shadow-md transition"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted border border-border/60">
                      {item.coverImageUrl ? (
                        <Image
                          src={item.coverImageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="object-contain transition-opacity duration-300 group-hover:opacity-95"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{item.name}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              {item.author.image ? (
                                <span className="inline-flex size-4 rounded-full overflow-hidden border bg-white">
                                  <Image
                                    src={item.author.image}
                                    alt={item.author.name ?? "Creator"}
                                    width={16}
                                    height={16}
                                    className="h-full w-full object-cover"
                                  />
                                </span>
                              ) : (
                                <span className="inline-flex size-4 rounded-full bg-muted border" />
                              )}
                              <span className="truncate max-w-[160px]">
                                {item.author.name || "Anonymous"}
                              </span>
                            </span>
                            {publishedLabel ? <span>• {publishedLabel}</span> : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "rounded-full h-9 w-9",
                              item.viewer?.hasLiked ? "text-pink-600" : "text-muted-foreground",
                            )}
                            onClick={async (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const ok = await requireLogin();
                              if (!ok) return;
                              toggleLike.mutate({ id: item.id });
                            }}
                            disabled={toggleLike.isPending}
                            aria-label="Like"
                          >
                            <Heart className={cn("size-4", item.viewer?.hasLiked ? "fill-current" : undefined)} />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "rounded-full h-9 w-9",
                              item.viewer?.hasBookmarked ? "text-foreground" : "text-muted-foreground",
                            )}
                            onClick={async (event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const ok = await requireLogin();
                              if (!ok) return;
                              toggleBookmark.mutate({ id: item.id });
                            }}
                            disabled={toggleBookmark.isPending}
                            aria-label="Bookmark"
                          >
                            <Bookmark
                              className={cn("size-4", item.viewer?.hasBookmarked ? "fill-current" : undefined)}
                            />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3" />
                          {item.stats.likes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Bookmark className="size-3" />
                          {item.stats.bookmarks}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {canvases.hasNextPage ? (
              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => canvases.fetchNextPage()}
                  disabled={canvases.isFetchingNextPage}
                >
                  {canvases.isFetchingNextPage ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            No published boards yet.
          </div>
        )}
      </main>
    </div>
  );
}

