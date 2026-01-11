"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ChevronDown, Loader2, Sparkles } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import {
  NANO_BANANA_PROFILE_OPTIONS,
  NANO_BANANA_PROFILE_STORAGE_KEY,
  parseNanoBananaProfileOption,
  type NanoBananaProfileOption,
} from "@/features/ai/lib/nano-banana-profile";
import { useGetCanvases } from "@/features/canvases/api/use-get-canvases";
import { useGetGalleryCanvases } from "@/features/gallery/api/use-get-gallery-canvases";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

import { TemplateCard } from "../template-card";

const PROMPT_STARTERS: Array<{ label: string; prompt: string }> = [
  { label: "Meme", prompt: "Create a meme-style avatar of a pig astronaut in a colorful pop-art style." },
  { label: "PFP", prompt: "Design a profile picture for a Web3 creator brand — bold, minimal, high-contrast." },
  { label: "Poster", prompt: "Design an event poster for a hackathon: title, date/time, and a strong CTA." },
  { label: "Logo", prompt: "Design a modern logo mark for a product called Pigcasso." },
  { label: "Sticker Pack", prompt: "Create a sticker pack of 6 cute pig expressions with transparent background." },
  { label: "Brand Kit", prompt: "Create a simple brand kit: palette + headline style + 3 social post layouts." },
  { label: "Landing Page", prompt: "HTML landing page for a new AI design tool. Modern, responsive, no external assets." },
  { label: "Short Video", prompt: "Storyboard a 15s short video ad with 5 scenes and on-screen captions." },
];

export default function AppHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, authenticated } = useRequireAuth("/app");
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const canvases = useGetCanvases({ enabled: ready && authenticated, limit: 8 });
  const gallery = useGetGalleryCanvases({ sort: "top", limit: 8 });

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiProfile, setAiProfile] = useState<NanoBananaProfileOption>("auto");

  const recentCanvases = canvases.data?.pages.flatMap((page) => page.data) ?? [];
  useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get("new") !== "1") return;
    promptRef.current?.focus();
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseNanoBananaProfileOption(window.localStorage.getItem(NANO_BANANA_PROFILE_STORAGE_KEY));
    if (!stored) return;
    setAiProfile(stored);
  }, []);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const onSubmitPrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      const canvasId = crypto.randomUUID();
      const params = new URLSearchParams();
      params.set("prompt", trimmed);
      if (aiProfile !== "auto") {
        params.set("profile", aiProfile);
      }
      router.push(`/canvas/${canvasId}?${params.toString()}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 pt-8">
      <section className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-soft">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            New
          </span>
          <span className="text-muted-foreground">
            Infinite canvas + chat — your new creative workspace
          </span>
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Design is easier with{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
            Pigcasso
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Start with a prompt. We’ll create a board and place the results right where you need them.
        </p>

        <div className="mt-8 w-full max-w-3xl">
          <div className="relative rounded-2xl border bg-card shadow-soft">
            <Textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Pigcasso to design a…"
              className="min-h-[120px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (event.nativeEvent.isComposing) return;
                if (event.shiftKey) return;

                  event.preventDefault();
                  void onSubmitPrompt();
              }}
            />

            <div className="flex items-center justify-between gap-3 px-4 pb-4">
              <div className="flex-1 flex items-center justify-start">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="secondary" className="rounded-full">
                      <span className="text-xs font-semibold">
                        {NANO_BANANA_PROFILE_OPTIONS.find((opt) => opt.id === aiProfile)?.label ?? "Model"}
                      </span>
                      <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Model</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={aiProfile}
                      onValueChange={(value) => {
                        const next = parseNanoBananaProfileOption(value);
                        if (!next) return;
                        setAiProfile(next);
                        try {
                          window.localStorage.setItem(NANO_BANANA_PROFILE_STORAGE_KEY, next);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      {NANO_BANANA_PROFILE_OPTIONS.map((opt) => (
                        <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                type="button"
                size="icon"
                className="rounded-full"
                onClick={() => void onSubmitPrompt()}
                disabled={busy || !prompt.trim()}
                aria-label="Create board"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </Button>
            </div>
          </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {PROMPT_STARTERS.map((starter) => (
            <Button
              key={starter.label}
                type="button"
                variant="secondary"
                className="rounded-full"
                disabled={busy}
                onClick={() => {
                  setPrompt(starter.prompt);
                  promptRef.current?.focus();
                }}
              >
                {starter.label === "Meme" ? <Sparkles className="size-4 mr-2" /> : null}
                {starter.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Recent Boards</h2>
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => router.push("/canvases")}>
            View all
          </Button>
        </div>

        {canvases.isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : canvases.isError ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {canvases.error?.message || "Failed to load canvases."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => router.push("/canvas/new")}
              className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-md transition"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Sparkles className="size-5" />
              </div>
              <div className="mt-4 font-semibold">New board</div>
              <div className="mt-1 text-xs text-muted-foreground">Infinite workspace.</div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/classic")}
              className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-md transition"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Sparkles className="size-5" />
              </div>
              <div className="mt-4 font-semibold">Classic</div>
              <div className="mt-1 text-xs text-muted-foreground">Templates + pages.</div>
            </button>

            {recentCanvases.slice(0, 7).map((canvas) => (
              <button
                key={canvas.id}
                type="button"
                onClick={() => router.push(`/canvas/${canvas.id}`)}
                className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-md transition"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted border border-border/60">
                  {canvas.coverImageUrl ? (
                    <Image
                      src={canvas.coverImageUrl}
                      alt={canvas.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 25vw"
                      className="object-contain transition-opacity duration-300 group-hover:opacity-95"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-cyan-400/10 to-yellow-300/10" />
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold truncate">{canvas.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Open board</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Gallery</h2>
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => router.push("/gallery")}>
            View all
          </Button>
        </div>

        {gallery.isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : gallery.isError ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {gallery.error?.message || "Failed to load gallery."}
          </div>
        ) : gallery.data?.pages.flatMap((page) => page.data).length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gallery.data?.pages
              .flatMap((page) => page.data)
              .slice(0, 8)
              .map((item) => (
              <TemplateCard
                key={item.id}
                title={item.name}
                imageSrc={item.coverImageUrl ?? ""}
                onClick={() => router.push(`/gallery/${item.id}`)}
                disabled={false}
                description="View-only board + chat"
                width={4}
                height={3}
                isPro={null}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            No published boards yet.
          </div>
        )}
      </section>
    </div>
  );
}
