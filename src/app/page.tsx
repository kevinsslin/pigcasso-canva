"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowRight,
  Brush,
  LayoutDashboard,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <Card className="bg-white/60 dark:bg-card/60 backdrop-blur border-white/40 dark:border-border shadow-soft">
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
  );
};

export default function LandingPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/app");
    }
  }, [authenticated, ready, router]);

  const onOpenApp = async () => {
    if (!ready) return;
    if (authenticated) {
      router.push("/app");
      return;
    }

    setOpening(true);
    try {
      await login();
    } finally {
      setOpening(false);
    }
  };

  const features = useMemo(
    () => [
      {
        icon: <Sparkles className="size-5 text-primary" />,
        title: "AI Generator",
        description:
          "Generate images and variations directly inside your canvas — tuned for creators and fast iteration.",
      },
      {
        icon: <LayoutDashboard className="size-5 text-cyan-500" />,
        title: "Creator Templates",
        description:
          "Start from curated templates built for X, Discord, Telegram, and Web3 content formats.",
      },
      {
        icon: <Wallet className="size-5 text-yellow-500" />,
        title: "Web3 Native",
        description:
          "Connect your wallet, unlock Pro with token-gating on Mantle, and prepare NFT export flows (coming soon).",
      },
    ],
    [],
  );

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
              href="#features"
            >
              Features
            </a>
            <a
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              href="#showcase"
            >
              Showcase
            </a>
            <a
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              href="#cta"
            >
              Get started
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
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
          <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-overlay" />
          <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-cyan-400/10 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-overlay" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-card/60 backdrop-blur border border-white/40 dark:border-border shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold tracking-wider text-foreground/80">
                  Web3 design canvas
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                Paint your{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
                  imagination
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed">
                Pigcasso is an AI-powered creative partner for Web3 creators. Generate
                visuals, remix templates, and refine your canvas with a draft → preview →
                apply workflow.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  type="button"
                  onClick={onOpenApp}
                  disabled={!ready || opening}
                  className="rounded-2xl px-8 py-6 text-base"
                >
                  <Brush className="mr-2 size-5" />
                  Start creating
                </Button>
                <Button
                  asChild
                  type="button"
                  variant="secondary"
                  className="rounded-2xl px-8 py-6 text-base"
                >
                  <a href="#features">See features</a>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[720px]">
                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-primary/25 to-cyan-400/25 blur-2xl" />
                <Image
                  src="/logo-pig.png"
                  alt="Pigcasso"
                  width={720}
                  height={720}
                  priority
                  className="relative w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="py-20 bg-white/60 dark:bg-card/40 border-y border-white/40 dark:border-border"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="text-xs font-extrabold text-primary uppercase tracking-[0.2em]">
                Power features
              </div>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
                Everything you need to create
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Built for speed, clarity, and creator workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f) => (
                <FeatureCard
                  key={f.title}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="showcase" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Designed for the creator economy
              </h3>
              <p className="text-muted-foreground text-lg">
                Create social posts, research visuals, and launch-ready design assets — all
                in one place.
              </p>
              <div className="flex flex-wrap gap-2">
                {["X", "Discord", "Telegram", "Research", "NFT cover"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-white/60 dark:bg-card/60 border border-white/40 dark:border-border text-sm font-semibold text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-primary/15 to-cyan-400/15 blur-xl" />
              <div className="relative rounded-[2rem] overflow-hidden border border-white/40 dark:border-border bg-white/60 dark:bg-card/60 backdrop-blur shadow-xl">
                <Image
                  src="/pig-banner.png"
                  alt="Pigcasso banner"
                  width={1500}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="cta" className="py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-white/10 shadow-2xl">
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500 via-purple-900 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500 via-blue-900 to-transparent" />
              </div>

              <div className="relative p-10 md:p-14 text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                  Ready to paint the future?
                </h2>
                <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
                  Open the app, connect your wallet, and start creating in seconds.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                  <Button
                    type="button"
                    onClick={onOpenApp}
                    disabled={!ready || opening}
                    className="rounded-full px-10 py-6 text-base bg-white text-slate-900 hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                  >
                    Get started for free
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
          </div>
        </section>
      </main>
    </div>
  );
}

