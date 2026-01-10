"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Brush,
  Coins,
  FolderOpen,
  Github,
  Loader2,
  Mic,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tilt } from "@/components/tilt";

import { BentoBadge } from "@/features/marketing/components/bento-badge";
import { BentoCard } from "@/features/marketing/components/bento-card";
import { FAQItem } from "@/features/marketing/components/faq-item";
import { FeatureCard } from "@/features/marketing/components/feature-card";
import { SectionTitle } from "@/features/marketing/components/section-title";
import { useOpenApp } from "@/features/marketing/hooks/use-open-app";

export default function LandingPage() {
  const { openApp, opening } = useOpenApp();
  const openChatCanvas = () => void openApp("/app?new=1");

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/70 backdrop-blur border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-cyan-400 p-0.5 shadow-lg shadow-pink-500/20 group-hover:rotate-6 transition-transform duration-300">
              <div className="w-full h-full rounded-full bg-white overflow-hidden">
                <Image
                  src="/logo-pig.png"
                  alt="Pigcasso"
                  width={40}
                  height={40}
                />
              </div>
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              Pigcasso
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 bg-white/40 px-6 py-2 rounded-full border border-white/50 backdrop-blur-sm">
            <a
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              href="#product"
            >
              Features
            </a>
            <a
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              href="#how"
            >
              How it works
            </a>
            <a
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              href="#pricing"
            >
              Plans
            </a>
            <a
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              href="#faq"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={openChatCanvas}
              disabled={opening}
              className="rounded-full px-6 bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-pink-500/30"
            >
              {opening ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Open ChatCanvas
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.45),_transparent_56%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgb(34_211_238_/_0.28),_transparent_62%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,_rgb(250_204_21_/_0.22),_transparent_58%)]" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(236,72,153,0.32)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.22)_1px,transparent_1px)] [background-size:64px_64px] pointer-events-none" />
          <div className="absolute -top-44 -right-44 w-[860px] h-[860px] bg-primary/28 blur-[120px] rounded-full motion-safe:animate-[pigcasso-drift_18s_ease-in-out_infinite]" />
          <div className="absolute top-1/2 -left-48 w-[740px] h-[740px] bg-cyan-400/24 blur-[110px] rounded-full motion-safe:animate-[pigcasso-float_16s_ease-in-out_infinite]" />
          <div className="absolute -bottom-64 left-1/3 w-[620px] h-[620px] bg-yellow-300/22 blur-[100px] rounded-full motion-safe:animate-[pigcasso-drift_22s_ease-in-out_infinite]" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-6 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/75 backdrop-blur border border-white/50 shadow-sm motion-safe:animate-[pigcasso-enter_650ms_ease-out_0ms_both]">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-foreground/80">
                    Infinite ChatCanvas for Web3
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight motion-safe:animate-[pigcasso-enter_780ms_ease-out_120ms_both]">
                  Design on an infinite canvas with{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                    Pigcasso
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 motion-safe:animate-[pigcasso-enter_780ms_ease-out_180ms_both]">
                  Talk to an AI design agent, iterate on an infinite canvas, and
                  publish what you make as verifiable assets (IPFS/NFT).
                  Repository → Asset turns GitHub repos into memes in one click.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start motion-safe:animate-[pigcasso-enter_780ms_ease-out_240ms_both]">
                  <Button
                    type="button"
                    onClick={openChatCanvas}
                    disabled={opening}
                    size="lg"
                    className="h-12 rounded-2xl px-8 text-base bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-pink-500/30 hover:shadow-glow motion-safe:transition-transform hover:-translate-y-0.5"
                  >
                    {opening ? (
                      <Loader2 className="mr-2 size-5 animate-spin" />
                    ) : (
                      <Brush className="mr-2 size-5" />
                    )}
                    {opening ? "Opening…" : "Open ChatCanvas"}
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void openApp("/app")}
                    disabled={opening}
                    size="lg"
                    className="h-12 rounded-2xl px-8 text-base bg-white/75 border border-white/60 shadow-soft hover:bg-white/90"
                  >
                    <FolderOpen className="mr-2 size-5 text-primary" />
                    Explore Creator Hub
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium motion-safe:animate-[pigcasso-enter_780ms_ease-out_260ms_both]">
                  <span>Sign in once. No credit card.</span>
                  <a
                    href="#how"
                    className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
                  >
                    See how it works <ArrowRight className="size-3" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 motion-safe:animate-[pigcasso-enter_780ms_ease-out_320ms_both]">
                  <BentoBadge>
                    <Blocks className="size-3.5 text-primary" />
                    ChatCanvas
                  </BentoBadge>
                  <BentoBadge>
                    <Github className="size-3.5 text-primary" />
                    Repository → Asset
                  </BentoBadge>
                  <BentoBadge>
                    <Coins className="size-3.5 text-yellow-500" />
                    Mint-ready
                  </BentoBadge>
                </div>
              </div>

              <div className="lg:col-span-6">
                <Tilt
                  className="relative motion-safe:animate-[pigcasso-fade_700ms_ease-out_140ms_both]"
                  max={6}
                  scale={1.01}
                >
                  <div className="relative rounded-[2.75rem] overflow-hidden border border-white/50 bg-white/70 backdrop-blur shadow-2xl aspect-[4/3] sm:aspect-[16/11] lg:aspect-[16/10]">
                    <Image
                      src="/pig-banner.png"
                      alt="Pigcasso hero"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                      className="object-cover object-right"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6 pointer-events-none">
                      <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/40 to-white/0 motion-safe:animate-[pigcasso-sheen_5.5s_ease-in-out_1.2s_infinite]" />
                    </div>
                  </div>

                  <div className="hidden sm:block absolute left-6 bottom-6 motion-safe:animate-[pigcasso-float_10s_ease-in-out_0ms_infinite]">
                    <div className="rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-xl px-4 py-3 transition-shadow duration-300 hover:shadow-glow">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/50">
                          <Sparkles className="size-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Gemini-native</div>
                          <div className="text-xs text-muted-foreground">
                            Image generation + assistant edits.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tilt>
              </div>
            </div>
          </div>
        </section>

        <section
          id="product"
          className="py-20 bg-gradient-to-b from-white/55 via-background to-white/55 border-y border-white/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Product"
              title="A canvas that turns ideas into assets"
              description="ChatCanvas for creation — plus GitHub, IPFS/NFT, and Printr for publishing."
            />

            <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[minmax(240px,auto)] lg:gap-6 xl:auto-rows-[minmax(260px,auto)]">
              <BentoCard className="md:col-span-2 lg:col-span-7 lg:row-span-2">
                <div className="pointer-events-none absolute inset-0">
                  <Image
                    src="/pig-banner.png"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-contain object-right opacity-20 sm:opacity-35"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/82 to-transparent" />
                </div>

                <div className="relative h-full flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/50">
                        <Blocks className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          ChatCanvas
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
                          Talk. Iterate. Ship.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <BentoBadge>
                        <Blocks className="size-3.5 text-primary" />
                        Infinite
                      </BentoBadge>
                      <BentoBadge>
                        <Coins className="size-3.5 text-yellow-500" />
                        Web3-native
                      </BentoBadge>
                    </div>
                  </div>

                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Start with a prompt, drop outputs onto a board, and keep
                    context in one workspace.
                  </p>

                  <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <Blocks className="mt-0.5 size-4 text-cyan-500" />
                      <span>Infinite canvas (tldraw) + pan/zoom</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mic className="mt-0.5 size-4 text-primary" />
                      <span>Chat-driven iterations (Talk)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Github className="mt-0.5 size-4 text-primary" />
                      <span>Repository → Asset (GitHub)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Coins className="mt-0.5 size-4 text-yellow-500" />
                      <span>IPFS/NFT export + publish</span>
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-5">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-cyan-400/18 to-indigo-500/10 flex items-center justify-center border border-white/60">
                        <Blocks className="size-5 text-cyan-500" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Space
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">
                          Bento-style pages
                        </div>
                      </div>
                    </div>
                    <BentoBadge>
                      <BadgeCheck className="size-3.5 text-primary" />
                      Public URL
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Build a public gateway page — drag blocks, swap order,
                    resize, and publish to share in your bio.
                  </p>

                  <div className="mt-auto pt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Brush className="size-4 text-primary" /> Drag + resize
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Rocket className="size-4 text-cyan-500" /> Publish +
                      share
                    </span>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-5">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/50">
                        <Mic className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          AI
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">
                          Pigcasso assistant
                        </div>
                      </div>
                    </div>
                    <BentoBadge>
                      <Sparkles className="size-3.5 text-primary" />
                      Draft-first
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Generate images (Nano Banana tiers), edit images, and draft
                    HTML — always in a draft-first loop.
                  </p>

                  <div className="mt-auto pt-6 flex flex-col gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Wand2 className="size-4 text-cyan-500" />
                      Suggests changes based on your current canvas.
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" />
                      You control the final apply step.
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-6">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-yellow-300/20 to-primary/10 flex items-center justify-center border border-white/60">
                        <Github className="size-5 text-gray-900" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Repositories
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">
                          Repository → Asset
                        </div>
                      </div>
                    </div>
                    <BentoBadge>
                      <BadgeCheck className="size-3.5 text-primary" />
                      GitHub OAuth
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Connect GitHub, browse repos, and generate meme assets from
                    code context. Publish to Printr when ready.
                  </p>

                  <div className="mt-auto pt-6 flex flex-wrap gap-2">
                    {[
                      {
                        label: "Public + private repos",
                        icon: <FolderOpen className="size-3.5 text-primary" />,
                      },
                      {
                        label: "Org repos (read:org)",
                        icon: <Github className="size-3.5 text-gray-900" />,
                      },
                      {
                        label: "Tokens encrypted at rest",
                        icon: <BadgeCheck className="size-3.5 text-yellow-500" />,
                      },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-soft"
                      >
                        {item.icon}
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-6">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/18 to-yellow-300/12 flex items-center justify-center border border-white/60">
                        <Coins className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Publish
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">
                          IPFS / Mint / Printr
                        </div>
                      </div>
                    </div>
                    <BentoBadge>
                      <BadgeCheck className="size-3.5 text-primary" />
                      Live
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Export to IPFS, mint as an NFT, and publish to Printr.
                    Template tokens can be layered on top (roadmap).
                  </p>

                  <div className="mt-auto pt-6 text-xs text-muted-foreground">
                    IPFS metadata • tokenURI/image URLs • marketplace links
                  </div>
                </div>
              </BentoCard>
            </div>

            <div className="mt-10 rounded-3xl border border-white/60 bg-white/70 backdrop-blur px-6 py-6 shadow-soft">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                    Try it
                  </div>
                  <div className="mt-1 text-xl font-extrabold tracking-tight text-gray-900">
                    Open ChatCanvas and start creating
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Generate, arrange, export, and publish — all in one place.
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={openChatCanvas}
                    disabled={opening}
                    className="rounded-full bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25 hover:opacity-95"
                  >
                    {opening ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Open ChatCanvas
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void openApp("/space/builder")}
                    disabled={opening}
                    className="rounded-full"
                  >
                    Build Space
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Workflow"
              title="Talk → canvas → publish"
              description="A simple loop from idea to verifiable assets."
            />

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Sparkles className="size-5 text-primary" />}
                title="1) Start with a prompt"
                description="Generate an image, edit an existing one, or draft HTML in seconds."
              />
              <FeatureCard
                icon={<Blocks className="size-5 text-cyan-500" />}
                title="2) Drop onto ChatCanvas"
                description="Pan/zoom on an infinite canvas and keep your context visible."
              />
              <FeatureCard
                icon={<Wand2 className="size-5 text-yellow-500" />}
                title="3) Tab/Tune (in progress)"
                description="Select parts and iterate with point-and-chat edits (coming soon)."
              />
              <FeatureCard
                icon={<Rocket className="size-5 text-primary" />}
                title="4) Export & publish"
                description="Export to IPFS/NFT, then publish to Printr or share anywhere."
              />
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      Talk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    Describe what you want. Outputs land on your canvas as
                    draftable assets.
                  </CardContent>
                </Card>
              </Tilt>
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="size-4 text-cyan-500" />
                      Tab
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    Click a part and ask for a change (in progress — coming
                    soon).
                  </CardContent>
                </Card>
              </Tilt>
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BadgeCheck className="size-4 text-yellow-500" />
                      Tune
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    Iterate until it’s ready — then export/mint/publish.
                  </CardContent>
                </Card>
              </Tilt>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="py-20 bg-white/60 border-y border-white/50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Plans"
              title="Start free, upgrade when you’re ready"
              description="Free to start. Pro unlocks via token gating — no credit card."
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-4">
                      <span>Free</span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        0 USD
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" />
                      ChatCanvas + editor workspace
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" />
                      Gemini AI (daily limits apply)
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" />
                      GitHub repos + Space builder
                    </div>
                    <Button
                      type="button"
                      onClick={openChatCanvas}
                      disabled={opening}
                      className="w-full rounded-2xl mt-3"
                    >
                      {opening ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Open ChatCanvas
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Tilt>

              <Tilt className="h-full">
                <Card className="h-full relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/10 shadow-2xl transition-shadow duration-300 hover:shadow-neon">
                  <div className="absolute inset-0 opacity-35">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500 via-purple-900 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500 via-blue-900 to-transparent" />
                  </div>
                  <CardHeader className="relative pb-2">
                    <CardTitle className="flex items-center justify-between gap-4">
                      <span>Pro</span>
                      <span className="text-sm font-semibold text-white/80">
                        Token-gated
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative space-y-3 text-sm text-white/80">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-white" />
                      Nano Banana Pro + higher AI limits
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-white" />
                      Token-gated access (hold PIG threshold)
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-white" />
                      More soon: template tokens + attribution
                    </div>
                    <Button
                      type="button"
                      onClick={openChatCanvas}
                      disabled={opening}
                      className="w-full rounded-2xl bg-white text-slate-900 hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.18)]"
                    >
                      {opening ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Open ChatCanvas
                      <ArrowRight className="ml-2 size-4 text-primary" />
                    </Button>
                  </CardContent>
                </Card>
              </Tilt>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="FAQ"
              title="Questions, answered"
              description="If you need anything else, we’ll add it to the roadmap."
            />
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FAQItem
                question="Do I need a wallet to use Pigcasso?"
                answer="You can start with email/social sign-in. Privy creates an embedded wallet. Connecting an external wallet unlocks token-gated Pro and onchain exports."
              />
              <FAQItem
                question="What is ChatCanvas?"
                answer="A Lovart-style infinite workspace where chat and assets live on the same canvas."
              />
              <FAQItem
                question="How does Repository → Asset work?"
                answer="Authorize GitHub, pick a repo, and Pigcasso generates a meme-style asset you can publish (Printr) or mint (NFT)."
              />
              <FAQItem
                question="Why can’t my NFT preview load?"
                answer="Most wallets require HTTPS gateway URLs. Set NEXT_PUBLIC_IPFS_GATEWAY (we normalize hostnames). If your tokenURI/image was minted as a relative URL, you must re-export + re-mint."
              />
              <FAQItem
                question="Why can’t I see my GitHub repositories?"
                answer="Ensure your GitHub scopes include 'repo' and 'read:org', then click “Authorize GitHub”. Some orgs require approving the OAuth app/SSO before repos appear."
              />
              <FAQItem
                question="How does Pro work?"
                answer="No Stripe. Pro unlocks via token gating when your wallet holds enough PIG (threshold is configurable via env)."
              />
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Tilt max={4} scale={1.01}>
              <div className="relative rounded-[2.75rem] overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/10 shadow-2xl transition-shadow duration-300 hover:shadow-neon">
                <div className="absolute inset-0 opacity-40">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500 via-purple-900 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500 via-blue-900 to-transparent" />
                </div>

                <div className="relative p-10 md:p-14 text-center">
                  <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                    Ready to turn ideas into assets?
                  </h2>
                  <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
                    Open ChatCanvas, generate your first board, then
                    export/mint/publish in one workflow.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                    <Button
                      type="button"
                      onClick={openChatCanvas}
                      disabled={opening}
                      size="lg"
                      className="h-12 rounded-full px-10 text-base bg-white text-slate-900 hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                    >
                      {opening ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      Open ChatCanvas
                      <ArrowRight className="ml-2 size-4 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="h-12 rounded-full px-10 text-base bg-white/10 text-white border border-white/20 hover:bg-white/15"
                      onClick={() => void openApp("/app")}
                      disabled={opening}
                    >
                      Explore Creator Hub
                      <ArrowRight className="ml-2 size-4 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="h-12 rounded-full px-10 text-base bg-white/10 text-white border border-white/20 hover:bg-white/15"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                    >
                      Back to top
                    </Button>
                  </div>
                </div>
              </div>
            </Tilt>
          </div>
        </section>

        <footer className="border-t border-white/50 bg-white/40 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-cyan-400 p-0.5 shadow-lg shadow-pink-500/20">
                  <div className="w-full h-full rounded-full bg-white overflow-hidden">
                    <Image
                      src="/logo-pig.png"
                      alt="Pigcasso"
                      width={36}
                      height={36}
                    />
                  </div>
                </div>
                <div>
                  <div className="font-bold">Pigcasso Canvas</div>
                  <div className="text-xs text-muted-foreground">
                    Infinite ChatCanvas + Web3 asset layer
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Blocks className="size-4" /> ChatCanvas
                </span>
                <span className="inline-flex items-center gap-2">
                  <Github className="size-4" /> Repository → Asset
                </span>
                <span className="inline-flex items-center gap-2">
                  <Coins className="size-4" /> IPFS/NFT export
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
              <div>
                © {new Date().getFullYear()} Pigcasso Canvas. All rights
                reserved.
              </div>
              <div className="flex items-center gap-4">
                <Link href="/app" className="hover:underline">
                  Open app
                </Link>
                <Link href="/app?new=1" className="hover:underline">
                  Open ChatCanvas
                </Link>
                <a href="#faq" className="hover:underline">
                  FAQ
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
