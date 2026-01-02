"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Blocks,
  Brush,
  Coins,
  CreditCard,
  Flame,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  Mic,
  Rocket,
  Search,
  Sparkles,
  Trophy,
  Wand2,
  Wallet,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tilt } from "@/components/tilt";

import { cn } from "@/lib/utils";

const FeatureCard = ({
  icon,
  title,
  description,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}) => {
  return (
    <Tilt className="h-full">
      <Card
        className={cn(
          "h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/40">
              {icon}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground leading-relaxed">
          {description}
        </CardContent>
      </Card>
    </Tilt>
  );
};

  const BentoCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <Tilt className={cn("h-full", className)} max={7} scale={1.01}>
      <div className="group relative h-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 backdrop-blur shadow-soft ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-cyan-400/12 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6 pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/55 to-white/0 opacity-0 group-hover:opacity-100 motion-safe:animate-[pigcasso-sheen_5.25s_ease-in-out_0.8s_infinite]" />
        </div>
        <div className="relative h-full p-6 sm:p-7 lg:p-8">{children}</div>
      </div>
    </Tilt>
  );
};

const BentoBadge = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-[0_2px_10px_rgb(0_0_0_/_0.04)]">
      {children}
    </span>
  );
};

const SectionTitle = ({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) => {
  const alignment = align === "left" ? "text-left" : "text-center";
  return (
    <div className={cn("max-w-3xl mx-auto", alignment)}>
      <div className="text-xs font-extrabold text-primary uppercase tracking-[0.2em]">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-muted-foreground text-lg">{description}</p>
      ) : null}
    </div>
  );
};

const StatChip = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Tilt>
      <div className="flex items-start gap-3 rounded-2xl bg-white/70 backdrop-blur border border-white/50 px-4 py-3 shadow-soft transition-shadow duration-300 hover:shadow-glow">
        <div className="mt-0.5 size-9 rounded-xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/40">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {description}
          </div>
        </div>
      </div>
    </Tilt>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  return (
    <details className="group rounded-2xl border border-white/50 bg-white/70 backdrop-blur px-5 py-4 shadow-soft">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
        <span className="font-semibold">{question}</span>
        <span className="text-muted-foreground transition group-open:rotate-180">
          <ArrowRight className="size-4 rotate-90" />
        </span>
      </summary>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{answer}</p>
    </details>
  );
};

const toSafeRedirectPath = (value: string | null) => {
  if (!value) return "/app";
  if (!value.startsWith("/")) return "/app";
  if (value.startsWith("//")) return "/app";
  return value;
};

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, login } = usePrivy();
  const [opening, setOpening] = useState(false);
  const handledAutoLoginRef = useRef(false);
  const [postLoginRedirect, setPostLoginRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !postLoginRedirect) {
      return;
    }
    router.replace(postLoginRedirect);
    setPostLoginRedirect(null);
  }, [authenticated, postLoginRedirect, ready, router]);

  const openApp = async (redirectTo = "/app") => {
    if (!ready) return;
    const safeRedirect = toSafeRedirectPath(redirectTo);

    if (authenticated) {
      router.push(safeRedirect);
      return;
    }

    handledAutoLoginRef.current = true;
    setPostLoginRedirect(safeRedirect);
    setOpening(true);
    try {
      await login();
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    if (!ready) {
      return;
    }

    const open = searchParams?.get("open") === "1";
    if (!open) {
      handledAutoLoginRef.current = false;
      return;
    }

    const redirectTo = toSafeRedirectPath(searchParams?.get("redirect"));

    if (authenticated) {
      if (!postLoginRedirect) {
        router.replace(redirectTo);
      }
      return;
    }

    if (handledAutoLoginRef.current) {
      return;
    }
    handledAutoLoginRef.current = true;

    setPostLoginRedirect(redirectTo);
    setOpening(true);
    Promise.resolve(login()).finally(() => setOpening(false));
  }, [authenticated, login, postLoginRedirect, ready, router, searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/70 backdrop-blur border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-cyan-400 p-0.5 shadow-lg shadow-pink-500/20 group-hover:rotate-6 transition-transform duration-300">
              <div className="w-full h-full rounded-full bg-white overflow-hidden">
                <Image src="/logo-pig.png" alt="Pigcasso" width={40} height={40} />
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
              href="#faq"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void openApp("/app")}
              disabled={!ready || opening}
              className="rounded-full px-6 bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-pink-500/30"
            >
              Open app
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
                    Canva-like for Web3 communities
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight motion-safe:animate-[pigcasso-enter_780ms_ease-out_120ms_both]">
                  Create community assets with{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                    Pigcasso AI
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 motion-safe:animate-[pigcasso-enter_780ms_ease-out_180ms_both]">
                  Browse project hubs, remix templates, and ship polished assets for X,
                  Discord, and Telegram. Track what people actually use with built-in
                  leaderboards — and unlock rewards &amp; cross-channel attribution on the
                  roadmap.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start motion-safe:animate-[pigcasso-enter_780ms_ease-out_240ms_both]">
                  <Button
                    type="button"
                    onClick={() => void openApp("/app")}
                    disabled={!ready || opening}
                    className="rounded-2xl px-8 py-6 text-base bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-pink-500/30 hover:shadow-glow motion-safe:transition-transform hover:-translate-y-0.5"
                  >
                    <Brush className="mr-2 size-5" />
                    Open app
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void openApp("/projects")}
                    disabled={!ready || opening}
                    className="rounded-2xl px-8 py-6 text-base bg-white/75 border border-white/60 shadow-soft hover:bg-white/90"
                  >
                    <FolderOpen className="mr-2 size-5 text-primary" />
                    Explore projects
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 motion-safe:animate-[pigcasso-enter_780ms_ease-out_320ms_both]">
                  <StatChip
                    icon={<FolderOpen className="size-5 text-primary" />}
                    title="Projects & asset hubs"
                    description="Official templates + community assets, organized per project."
                  />
                  <StatChip
                    icon={<Trophy className="size-5 text-cyan-500" />}
                    title="Leaderboards"
                    description="See what’s trending and who’s contributing across projects."
                  />
                </div>
              </div>

              <div className="lg:col-span-6">
                <Tilt
                  className="relative motion-safe:animate-[pigcasso-fade_700ms_ease-out_140ms_both]"
                  max={6}
                  scale={1.01}
                >
                  <div className="relative rounded-[2.75rem] overflow-hidden border border-white/50 bg-white/70 backdrop-blur shadow-2xl">
                    <Image
                      src="/pig-banner.png"
                      alt="Pigcasso hero"
                      width={1500}
                      height={500}
                      priority
                      className="w-full h-auto"
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

	                  <div className="hidden sm:block absolute left-6 top-6 motion-safe:animate-[pigcasso-float_12s_ease-in-out_900ms_infinite]">
	                    <div className="rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-xl px-4 py-3 transition-shadow duration-300 hover:shadow-glow">
	                      <div className="flex items-center gap-3">
	                        <div className="size-10 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/50">
	                          <LayoutTemplate className="size-5 text-cyan-500" />
	                        </div>
	                        <div>
	                          <div className="text-sm font-bold">Creator presets</div>
	                          <div className="text-xs text-muted-foreground">
	                            Export-ready sizes
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
              title="A canvas that ships with you"
              description="Designed for creators and communities: build assets, publish fast, and track what people use."
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6 lg:auto-rows-[minmax(240px,auto)] xl:auto-rows-[minmax(260px,auto)]">
	              <BentoCard className="lg:col-span-8 lg:row-span-2">
                <div className="absolute inset-0">
                  <Image
                    src="/pig-banner.png"
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/70 to-transparent" />
                </div>

                <div className="relative h-full flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/50">
                        <FolderOpen className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Projects × Canvas
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
                          Create assets. Track mindshare.
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <BentoBadge>
                        <BadgeCheck className="size-3.5 text-primary" />
                        B2B-ready
                      </BentoBadge>
                      <BentoBadge>
                        <Sparkles className="size-3.5 text-primary" />
                        AI-native
                      </BentoBadge>
                    </div>
                  </div>

	                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xl">
	                    Start from a project hub, remix on the canvas with Pigcasso assistant, then watch leaderboards evolve from real usage.
	                  </p>

	                  <div className="mt-auto pt-6">
	                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
	                      <div className="flex items-center gap-2">
	                        <LayoutTemplate className="size-4 text-cyan-500" />
	                        Avatar frames, stickers, seasonal templates
	                      </div>
	                      <div className="flex items-center gap-2">
	                        <Sparkles className="size-4 text-primary" />
	                        Assistant: draft → preview → apply
	                      </div>
	                      <div className="flex items-center gap-2">
                        <Trophy className="size-4 text-yellow-500" />
                        Leaderboards + contribution tracking
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row gap-3">
                      <Button
                        type="button"
                        onClick={() => void openApp("/projects")}
                        disabled={!ready || opening}
                        className="rounded-2xl bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-pink-500/30"
                      >
                        Explore projects <ArrowRight className="ml-2 size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void openApp("/app")}
                        disabled={!ready || opening}
                        className="rounded-2xl bg-white/80 border border-white/60 shadow-soft hover:bg-white"
                      >
                        Open editor <Brush className="ml-2 size-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-4">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/50">
                        <Brush className="size-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Editor
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">Canva-like canvas</div>
                      </div>
                    </div>
                    <BentoBadge>
                      <LayoutDashboard className="size-3.5 text-yellow-500" />
                      Fast exports
                    </BentoBadge>
                  </div>

	                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
	                    Drag, resize, align, and remix. Export with presets so assets look right on every channel.
	                  </p>
	                </div>
	              </BentoCard>

              <BentoCard className="lg:col-span-4">
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
                        <div className="text-xl font-extrabold tracking-tight">Pigcasso assistant</div>
                      </div>
                    </div>
                    <BentoBadge>
                      <Sparkles className="size-3.5 text-primary" />
                      Draft-first
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Ask in natural language (or voice), preview proposed edits, then apply when you’re happy.
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

              <BentoCard className="lg:col-span-6 xl:col-span-3">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
	                      <div className="size-11 rounded-2xl bg-gradient-to-br from-yellow-300/20 to-primary/10 flex items-center justify-center border border-white/60">
	                        <Trophy className="size-5 text-yellow-500" />
	                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Signals
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">Leaderboards</div>
                      </div>
                    </div>
                    <BentoBadge>
                      <Flame className="size-3.5 text-primary" />
                      Mindshare
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Track what’s used in the wild: top projects, assets, and creators.
                  </p>

                  <div className="mt-auto pt-6 flex flex-wrap gap-2">
                    {[
                      { label: "Top creators", icon: <Trophy className="size-3.5 text-yellow-500" /> },
                      { label: "Top assets", icon: <LayoutTemplate className="size-3.5 text-cyan-500" /> },
                      { label: "Top projects", icon: <Rocket className="size-3.5 text-primary" /> },
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

              <BentoCard className="lg:col-span-6 xl:col-span-3">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
	                      <div className="size-11 rounded-2xl bg-gradient-to-br from-cyan-400/18 to-indigo-500/10 flex items-center justify-center border border-white/60">
	                        <ArrowLeftRight className="size-5 text-cyan-500" />
	                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Identity
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">Link socials</div>
                      </div>
                    </div>
                    <BentoBadge>
                      <Wallet className="size-3.5 text-muted-foreground" />
                      Wallet-first
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Connect your wallet today. Link X, Discord, and Telegram for cross-channel attribution (roadmap).
                  </p>

                  <div className="mt-auto pt-6 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" /> No passwords
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Blocks className="size-4 text-cyan-500" /> One identity
                    </span>
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-6 xl:col-span-3">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
	                      <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/18 to-yellow-300/12 flex items-center justify-center border border-white/60">
	                        <Coins className="size-5 text-primary" />
	                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Monetize
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">Template tokens</div>
                      </div>
                    </div>
                    <BentoBadge>
                      <Rocket className="size-3.5 text-primary" />
                      Coming soon
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Launch a token per template on Printr. Narratives combine meme energy + real usage cashflow.
                  </p>

                  <div className="mt-auto pt-6 text-xs text-muted-foreground">
                    Stake-to-use and pay-to-use models are on the roadmap.
                  </div>
                </div>
              </BentoCard>

              <BentoCard className="lg:col-span-6 xl:col-span-3">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
	                      <div className="size-11 rounded-2xl bg-gradient-to-br from-slate-900/8 to-primary/10 flex items-center justify-center border border-white/60">
	                        <CreditCard className="size-5 text-muted-foreground" />
	                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">
                          Access
                        </div>
                        <div className="text-xl font-extrabold tracking-tight">Stake to use</div>
                      </div>
                    </div>
                    <BentoBadge>
                      <BadgeCheck className="size-3.5 text-primary" />
                      Coming soon
                    </BentoBadge>
                  </div>

                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Unlock premium templates by staking the template token for a period — or pay per use.
                  </p>

                  <div className="mt-auto pt-6 flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowLeftRight className="size-4" />
                    Flexible pricing model (to be finalized).
                  </div>
                </div>
              </BentoCard>
            </div>
          </div>
        </section>

	        <section id="how" className="py-20">
	          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Workflow"
              title="Create → publish → track"
              description="A simple loop for communities and creators."
            />

	            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<FolderOpen className="size-5 text-primary" />}
                title="1) Pick a project"
                description="Jump into a project hub and choose the templates your community actually uses."
              />
              <FeatureCard
                icon={<Search className="size-5 text-cyan-500" />}
                title="2) Create assets"
                description="Upload images, search stock, and remix templates on a Canva-like canvas."
              />
              <FeatureCard
                icon={<Mic className="size-5 text-yellow-500" />}
                title="3) Ask Pigcasso"
                description="Use voice or text to draft edits. Preview the changes before applying."
              />
	              <FeatureCard
	                icon={<Rocket className="size-5 text-primary" />}
	                title="4) Publish & track"
	                description="Publish assets, then watch leaderboards evolve as the community remixes."
	              />
	            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      Draft
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    The assistant proposes edits as structured actions, not guessy “magic”.
                  </CardContent>
                </Card>
              </Tilt>
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="size-4 text-cyan-500" />
                      Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    You can preview changes before committing — iterate without fear.
                  </CardContent>
                </Card>
              </Tilt>
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 backdrop-blur border-white/50 shadow-soft transition-shadow duration-300 hover:shadow-glow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BadgeCheck className="size-4 text-yellow-500" />
                      Apply
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    Apply instantly to your existing canvas — or clear the draft and try again.
                  </CardContent>
                </Card>
              </Tilt>
            </div>
          </div>
        </section>

	        <section id="pricing" className="py-20 bg-white/60 border-y border-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Plans"
              title="Start free, upgrade when you’re ready"
              description="A simple model that fits creator workflows."
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
                      Core editor + presets
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" />
                      Gemini AI (limits apply)
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-primary" />
                      Uploads + stock search
                    </div>
                    <Button
                      type="button"
                      onClick={() => void openApp("/app")}
                      disabled={!ready || opening}
                      className="w-full rounded-2xl mt-3"
                    >
                      Open app
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
	                      <span className="text-sm font-semibold text-white/80">Roadmap</span>
	                    </CardTitle>
	                  </CardHeader>
	                  <CardContent className="relative space-y-3 text-sm text-white/80">
	                    <div className="flex items-center gap-2">
	                      <BadgeCheck className="size-4 text-white" />
	                      Premium templates + higher AI limits
	                    </div>
	                    <div className="flex items-center gap-2">
	                      <BadgeCheck className="size-4 text-white" />
	                      Partner projects + custom hubs
	                    </div>
	                    <div className="flex items-center gap-2">
	                      <BadgeCheck className="size-4 text-white" />
	                      Attribution signals + rewards (roadmap)
	                    </div>
	                    <Button
	                      type="button"
	                      onClick={() => void openApp("/app")}
	                      disabled={!ready || opening}
                      className="w-full rounded-2xl bg-white text-slate-900 hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.18)]"
                    >
                      Open app
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
                answer="You can start with email/social sign-in. A wallet unlocks Web3-native features like token-gated Pro and onchain exports (roadmap)."
              />
              <FAQItem
                question="How does the assistant change my design?"
                answer="It reads a snapshot of the canvas and returns structured draft actions. You can preview and then apply."
              />
              <FAQItem
                question="What is a Project?"
                answer="A Project is a hub that groups templates and community assets for a partner community, plus lightweight tracking and leaderboards."
              />
              <FAQItem
                question="How do leaderboards work?"
                answer="Leaderboards start with in-app signals (templates/remixes). Cross-channel attribution for X/Discord/TG is a roadmap milestone."
              />
              <FAQItem
                question="What are template tokens?"
                answer="Template tokens let creators launch a tradable token for a template on Printr. Stake-to-use/pay-to-use is on the roadmap."
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
                    Ready to ship community assets?
                  </h2>
                  <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
                    Open the app, join a project hub, and publish assets your community can
                    actually reuse.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                    <Button
                      type="button"
                      onClick={() => void openApp("/app")}
                      disabled={!ready || opening}
                      className="rounded-full px-10 py-6 text-base bg-white text-slate-900 hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                    >
                      Open app
                      <ArrowRight className="ml-2 size-4 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full px-10 py-6 text-base bg-white/10 text-white border border-white/20 hover:bg-white/15"
                      onClick={() => void openApp("/projects")}
                      disabled={!ready || opening}
                    >
                      Explore projects
                      <ArrowRight className="ml-2 size-4 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full px-10 py-6 text-base bg-white/10 text-white border border-white/20 hover:bg-white/15"
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
                    <Image src="/logo-pig.png" alt="Pigcasso" width={36} height={36} />
                  </div>
                </div>
                <div>
                  <div className="font-bold">Pigcasso Canvas</div>
                  <div className="text-xs text-muted-foreground">
                    Canva-like community asset hub
                  </div>
                </div>
              </div>

	              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
	                <span className="inline-flex items-center gap-2">
	                  <FolderOpen className="size-4" /> Project asset hubs
	                </span>
	                <span className="inline-flex items-center gap-2">
	                  <Trophy className="size-4" /> Lightweight leaderboards
	                </span>
	              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
              <div>© {new Date().getFullYear()} Pigcasso Canvas. All rights reserved.</div>
              <div className="flex items-center gap-4">
                <Link href="/app" className="hover:underline">
                  Open app
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
