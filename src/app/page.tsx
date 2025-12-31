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
  LayoutDashboard,
  LayoutTemplate,
  Mic,
  Rocket,
  Search,
  Sparkles,
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
          "h-full bg-white/60 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft transition-shadow duration-300 hover:shadow-glow",
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/30 dark:border-border">
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
      <div className="flex items-start gap-3 rounded-2xl bg-white/60 dark:bg-card/60 backdrop-blur border border-white/40 dark:border-border px-4 py-3 shadow-soft transition-shadow duration-300 hover:shadow-glow">
        <div className="mt-0.5 size-9 rounded-xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/30 dark:border-border">
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
    <details className="group rounded-2xl border border-white/40 dark:border-border bg-white/60 dark:bg-card/60 backdrop-blur px-5 py-4 shadow-soft">
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

  const onOpenApp = async () => {
    if (!ready) return;
    if (authenticated) {
      router.push("/app");
      return;
    }

    handledAutoLoginRef.current = true;
    setPostLoginRedirect("/app");
    setOpening(true);
    try {
      await login();
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/60 dark:bg-card/50 backdrop-blur border-b border-white/40 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-cyan-400 p-0.5 shadow-lg shadow-pink-500/20 group-hover:rotate-6 transition-transform duration-300">
              <div className="w-full h-full rounded-full bg-white overflow-hidden">
                <Image src="/logo-pig.png" alt="Pigcasso" width={40} height={40} />
              </div>
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 dark:to-cyan-300">
              Pigcasso
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 bg-white/40 dark:bg-black/20 px-6 py-2 rounded-full border border-white/50 dark:border-border backdrop-blur-sm">
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
              onClick={onOpenApp}
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.28),_transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgb(34_211_238_/_0.18),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,_rgb(250_204_21_/_0.14),_transparent_55%)]" />
          <div className="absolute -top-44 -right-44 w-[860px] h-[860px] bg-primary/20 blur-[120px] rounded-full mix-blend-multiply motion-safe:animate-[pigcasso-drift_18s_ease-in-out_infinite]" />
          <div className="absolute top-1/2 -left-48 w-[740px] h-[740px] bg-cyan-400/18 blur-[110px] rounded-full mix-blend-multiply motion-safe:animate-[pigcasso-float_16s_ease-in-out_infinite]" />
          <div className="absolute -bottom-64 left-1/3 w-[620px] h-[620px] bg-yellow-300/16 blur-[100px] rounded-full mix-blend-multiply motion-safe:animate-[pigcasso-drift_22s_ease-in-out_infinite]" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-6 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/75 backdrop-blur border border-white/50 shadow-sm motion-safe:animate-[pigcasso-enter_650ms_ease-out_0ms_both]">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold tracking-wider text-foreground/80">
                    Next-generation Canva for Web3 creators
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight motion-safe:animate-[pigcasso-enter_780ms_ease-out_120ms_both]">
                  Create faster with{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                    Pigcasso AI
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 motion-safe:animate-[pigcasso-enter_780ms_ease-out_180ms_both]">
                  A modern canvas built for creators: presets for X/Discord/Telegram,
                  Gemini-powered generation, and a Pigcasso assistant that drafts edits
                  before you apply them.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start motion-safe:animate-[pigcasso-enter_780ms_ease-out_240ms_both]">
                  <Button
                    type="button"
                    onClick={onOpenApp}
                    disabled={!ready || opening}
                    className="rounded-2xl px-8 py-6 text-base bg-gradient-to-r from-primary via-pink-500 to-purple-600 text-white hover:opacity-95 shadow-lg shadow-pink-500/30 hover:shadow-glow motion-safe:transition-transform hover:-translate-y-0.5"
                  >
                    <Brush className="mr-2 size-5" />
                    Open app
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="secondary"
                    className="rounded-2xl px-8 py-6 text-base"
                  >
                    <a href="#how">See how it works</a>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 motion-safe:animate-[pigcasso-enter_780ms_ease-out_320ms_both]">
                  <StatChip
                    icon={<BadgeCheck className="size-5 text-primary" />}
                    title="Draft → Preview → Apply"
                    description="Make edits safely, then apply with confidence."
                  />
                  <StatChip
                    icon={<Wallet className="size-5 text-cyan-500" />}
                    title="Wallet-friendly"
                    description="External wallet support + token-gated Pro."
                  />
                </div>
              </div>

              <div className="lg:col-span-6">
                <Tilt
                  className="relative motion-safe:animate-[pigcasso-fade_700ms_ease-out_140ms_both]"
                  max={6}
                  scale={1.01}
                >
                  <div className="relative rounded-[2.75rem] overflow-hidden border border-white/40 dark:border-border bg-white/60 dark:bg-card/60 backdrop-blur shadow-2xl">
                    <Image
                      src="/pig-banner.png"
                      alt="Pigcasso hero"
                      width={1500}
                      height={500}
                      priority
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 -left-1/3 w-1/2 rotate-6 pointer-events-none">
                      <div className="h-full w-full bg-gradient-to-r from-white/0 via-white/40 to-white/0 motion-safe:animate-[pigcasso-sheen_5.5s_ease-in-out_1.2s_infinite]" />
                    </div>
                  </div>

                  <div className="hidden sm:block absolute left-6 bottom-6 motion-safe:animate-[pigcasso-float_10s_ease-in-out_0ms_infinite]">
                    <div className="rounded-2xl bg-white/85 dark:bg-card/70 backdrop-blur border border-white/40 dark:border-border shadow-xl px-4 py-3 transition-shadow duration-300 hover:shadow-glow">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/30 dark:border-border">
                          <Sparkles className="size-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Gemini-native</div>
                          <div className="text-xs text-muted-foreground">
                            Fast image generation + assistant edits.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="hidden sm:block absolute left-6 top-6 motion-safe:animate-[pigcasso-float_12s_ease-in-out_900ms_infinite]">
                    <div className="rounded-2xl bg-white/85 dark:bg-card/70 backdrop-blur border border-white/40 dark:border-border shadow-xl px-4 py-3 transition-shadow duration-300 hover:shadow-glow">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 flex items-center justify-center border border-white/30 dark:border-border">
                          <LayoutTemplate className="size-5 text-cyan-500" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Creator presets</div>
                          <div className="text-xs text-muted-foreground">
                            X · Discord · Telegram
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

        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: "X-ready", icon: <Flame className="size-4 text-primary" /> },
                { label: "Discord banners", icon: <Blocks className="size-4 text-cyan-500" /> },
                { label: "Telegram cards", icon: <LayoutDashboard className="size-4 text-yellow-500" /> },
                { label: "Stock search", icon: <Search className="size-4 text-muted-foreground" /> },
                { label: "Uploads", icon: <BadgeCheck className="size-4 text-muted-foreground" /> },
              ].map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-card/60 border border-white/40 dark:border-border text-sm font-semibold text-muted-foreground shadow-soft hover:text-foreground hover:shadow-glow motion-safe:transition-transform motion-safe:duration-150 hover:-translate-y-0.5"
                >
                  {item.icon}
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section
          id="product"
          className="py-20 bg-white/60 dark:bg-card/40 border-y border-white/40 dark:border-border"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Product"
              title="A canvas that ships with you"
              description="Designed for speed, clarity, and iterative creator workflows."
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Sparkles className="size-5 text-primary" />}
                title="Gemini-first AI"
                description="Generate images and ask the assistant to propose edits for what’s already on the canvas."
              />
              <FeatureCard
                icon={<LayoutTemplate className="size-5 text-cyan-500" />}
                title="Creator templates"
                description="Start from curated templates and presets built for social and Web3 content formats."
              />
              <FeatureCard
                icon={<Wallet className="size-5 text-yellow-500" />}
                title="Web3 ready"
                description="Connect wallets, unlock Pro with token-gating on Mantle, and turn templates into on-chain-native assets (coming soon)."
              />
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FeatureCard
                className="lg:col-span-2"
                icon={<Wand2 className="size-5 text-primary" />}
                title="Pigcasso assistant inside the editor"
                description="Ask in natural language (or voice), preview the draft changes, and apply them when you’re happy."
              />
              <FeatureCard
                icon={<CreditCard className="size-5 text-cyan-500" />}
                title="Token-gated Pro"
                description="Unlock pro packs and higher limits via token-gating — without changing your workflow."
              />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FeatureCard
                className="lg:col-span-2"
                icon={<Coins className="size-5 text-primary" />}
                title="Template token launchpad (coming soon)"
                description="Creators will be able to launch a token per template on Printr for price discovery (meme + usage cashflow narrative) and distribution."
              />
              <FeatureCard
                icon={<ArrowLeftRight className="size-5 text-cyan-500" />}
                title="Stake-to-use (coming soon)"
                description="Unlock templates by staking the template token (discounts/credits), or pay per use (roadmap)."
              />
            </div>
          </div>
        </section>

        <section id="how" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Workflow"
              title="From idea → publish in minutes"
              description="A simple flow that keeps you in control."
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<LayoutTemplate className="size-5 text-primary" />}
                title="1) Pick a format"
                description="Choose presets for X, Discord, and Telegram — or start from a template."
              />
              <FeatureCard
                icon={<Search className="size-5 text-cyan-500" />}
                title="2) Add assets"
                description="Upload images or search stock, then drop them onto the canvas."
              />
              <FeatureCard
                icon={<Mic className="size-5 text-yellow-500" />}
                title="3) Ask Pigcasso"
                description="Tell the assistant what to improve — it drafts changes before applying."
              />
              <FeatureCard
                icon={<Rocket className="size-5 text-primary" />}
                title="4) Export & share"
                description="Publish your design and reuse it across your creator pipeline."
              />
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Tilt className="h-full">
                <Card className="h-full bg-white/60 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft transition-shadow duration-300 hover:shadow-glow">
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
                <Card className="h-full bg-white/60 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft transition-shadow duration-300 hover:shadow-glow">
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
                <Card className="h-full bg-white/60 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft transition-shadow duration-300 hover:shadow-glow">
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

        <section id="pricing" className="py-20 bg-white/60 dark:bg-card/40 border-y border-white/40 dark:border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Plans"
              title="Start free, upgrade when you’re ready"
              description="A simple model that fits creator workflows."
            />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Tilt className="h-full">
                <Card className="h-full bg-white/70 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft transition-shadow duration-300 hover:shadow-glow">
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
                      onClick={onOpenApp}
                      disabled={!ready || opening}
                      className="w-full rounded-2xl mt-3"
                    >
                      Get started
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
                      Higher AI limits
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-white" />
                      Premium templates
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-white" />
                      Priority features (roadmap)
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="size-4 text-white" />
                      Unlock via wallet on Mantle
                    </div>
                    <Button
                      type="button"
                      onClick={onOpenApp}
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
                answer="You can start with email/social sign-in. Wallets unlock Web3-native features and token-gated Pro."
              />
              <FAQItem
                question="How does the assistant change my design?"
                answer="It reads a snapshot of the canvas and returns structured draft actions. You can preview and then apply."
              />
              <FAQItem
                question="Can I export as NFT?"
                answer="NFT export is on the roadmap. We’ll support one-click IPFS metadata + mint flows (coming soon)."
              />
              <FAQItem
                question="What are template tokens?"
                answer="Template tokens let creators launch a tradable token for a template on Printr. Users can stake tokens to unlock usage/credits (coming soon)."
              />
              <FAQItem
                question="Can I connect multiple external wallets?"
                answer="Yes — you can connect more than one external wallet and choose which one to use."
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
                    Ready to paint the future?
                  </h2>
                  <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
                    Open the app, connect your wallet, and ship creator-grade
                    designs.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                    <Button
                      type="button"
                      onClick={onOpenApp}
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

        <footer className="border-t border-white/40 dark:border-border bg-white/40 dark:bg-card/30 backdrop-blur">
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
                  <div className="text-xs text-muted-foreground">Web3-native creator design tool</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CreditCard className="size-4" /> Pro via token-gating
                </span>
                <span className="inline-flex items-center gap-2">
                  <Wand2 className="size-4" /> Draft-first assistant
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
