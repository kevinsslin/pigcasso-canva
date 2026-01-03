"use client";

import Link from "next/link";
import { ArrowRight, Globe, Pencil, Rocket, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useMe } from "@/features/auth/api/use-me";
import { getCanonicalSpaceHandle } from "@/features/spaces/lib/space-handle";
import { useMySpaceDocument } from "@/features/spaces/api/use-my-space-document";
import { CopySpaceLink } from "@/features/spaces/components/copy-space-link";

export default function SpaceHomePage() {
  const { ready, authenticated } = useRequireAuth("/space");
  const me = useMe();
  const space = useMySpaceDocument({ enabled: ready && authenticated });

  if (!ready || !authenticated || me.isLoading || space.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading Space…
      </div>
    );
  }

  const user = me.data?.data.user ?? null;
  const handle = user ? getCanonicalSpaceHandle({ id: user.id, socials: user.socials }) : null;
  const spacePath = handle ? `/space/${encodeURIComponent(handle)}` : null;
  const isPublished = space.data?.isPublished ?? false;
  const draftJson = JSON.stringify(space.data?.document ?? null);
  const publishedJson = space.data?.publishedDocument ? JSON.stringify(space.data.publishedDocument) : null;
  const hasLiveChanges = Boolean(isPublished && (publishedJson === null || draftJson !== publishedJson));

  const statusLabel = !isPublished ? "Draft" : hasLiveChanges ? "Changes not live" : "Live";
  const statusIcon = !isPublished ? (
    <Pencil className="size-4 text-primary" />
  ) : hasLiveChanges ? (
    <Rocket className="size-4 text-amber-600" />
  ) : (
    <Rocket className="size-4 text-emerald-600" />
  );

  return (
    <div className="relative h-full overflow-auto bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 right-[-12rem] h-[36rem] w-[36rem] rounded-full bg-primary/16 blur-3xl motion-safe:animate-[pigcasso-drift_18s_ease-in-out_infinite]" />
        <div className="absolute top-[35%] left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-cyan-400/14 blur-3xl motion-safe:animate-[pigcasso-float_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-14rem] right-[20%] h-[34rem] w-[34rem] rounded-full bg-yellow-300/12 blur-3xl motion-safe:animate-[pigcasso-drift_22s_ease-in-out_infinite]" />
        <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(to_right,rgba(236,72,153,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative mx-auto flex h-full max-w-[1100px] flex-col px-4 py-8 sm:px-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-700 shadow-soft">
              <Sparkles className="size-4 text-primary" />
              Bento-style public gateway page
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              My Space
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag modules, arrange your layout, and publish a shareable Space URL.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-700 shadow-soft">
              {statusIcon}
              {statusLabel}
            </div>
            {spacePath ? (
              <div className="text-xs text-muted-foreground">
                {spacePath}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-gray-900">Edit your Space</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Rearrange blocks like Bento, then publish when it looks right.
                </div>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Pencil className="size-5" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="rounded-2xl bg-primary text-white shadow-glow hover:opacity-95">
                <Link href="/space/builder">
                  Open builder <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-2xl border border-white/70 bg-white/70">
                <Link href="/app">
                  Open editor <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-gray-900">View public Space</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {isPublished
                    ? "See what others will see at your published URL."
                    : "Preview your Space before publishing it publicly."}
                </div>
              </div>
              <div className="flex size-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-700">
                <Globe className="size-5" />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {spacePath ? (
                isPublished ? (
                  <Button asChild variant="secondary" className="rounded-2xl border border-white/70 bg-white/70">
                    <Link href={spacePath} target="_blank" rel="noreferrer">
                      View live <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="secondary" className="rounded-2xl border border-white/70 bg-white/70">
                    <Link href="/space/builder?mode=preview">
                      Preview draft <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                )
              ) : (
                <Button variant="secondary" className="rounded-2xl border border-white/70 bg-white/70" disabled>
                  Preview draft <ArrowRight className="ml-2 size-4" />
                </Button>
              )}
              {spacePath ? <CopySpaceLink path={spacePath} /> : null}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              {!isPublished
                ? "Tip: Publish when you’re ready to share your Space publicly."
                : hasLiveChanges
                  ? "Your draft has changes that aren’t live yet. Open the builder to update your Space."
                  : "Your Space is live and up to date."}
            </div>
          </Card>
        </div>

        <div className="mt-auto pt-10 text-xs text-muted-foreground">
          Need to onboard Projects or manage templates? Use the admin dashboard (coming soon).
        </div>
      </div>
    </div>
  );
}
