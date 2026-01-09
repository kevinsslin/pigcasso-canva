"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Plus } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGetCanvases } from "@/features/canvases/api/use-get-canvases";

import { Button } from "@/components/ui/button";

export default function CanvasesPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth("/canvases");
  const canvases = useGetCanvases({ enabled: ready && authenticated, limit: 24 });

  const items = canvases.data?.pages.flatMap((page) => page.data) ?? [];

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Canvases</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your infinite canvases — backed by your account.
          </p>
        </div>

        <Button type="button" onClick={() => router.push("/canvas/new")} className="rounded-full">
          <Plus className="size-4 mr-2" />
          New canvas
        </Button>
      </div>

      {canvases.isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 text-muted-foreground animate-spin" />
        </div>
      ) : canvases.isError ? (
        <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
          {canvases.error?.message || "Failed to load canvases."}
        </div>
      ) : items.length ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((canvas) => {
              const updatedLabel = canvas.updatedAt
                ? formatDistanceToNow(new Date(canvas.updatedAt), { addSuffix: true })
                : null;

              return (
                <button
                  key={canvas.id}
                  type="button"
                  onClick={() => router.push(`/canvas/${canvas.id}`)}
                  className="group rounded-2xl border bg-card p-4 text-left shadow-soft hover:shadow-md transition"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted border border-border/60">
                    {canvas.coverImageUrl ? (
                      <Image
                        src={canvas.coverImageUrl}
                        alt={canvas.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-semibold truncate">{canvas.name}</div>
                    {updatedLabel ? (
                      <div className="mt-1 text-xs text-muted-foreground">Updated {updatedLabel}</div>
                    ) : (
                      <div className="mt-1 text-xs text-muted-foreground">—</div>
                    )}
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
                {canvases.isFetchingNextPage ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : null}
                Load more
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          No canvases yet.
        </div>
      )}
    </div>
  );
}

