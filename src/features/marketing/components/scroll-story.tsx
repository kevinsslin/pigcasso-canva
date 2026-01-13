"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/features/marketing/hooks/use-prefers-reduced-motion";
import { useScrollProgress } from "@/features/marketing/hooks/use-scroll-progress";
import { computeStepMix } from "@/features/marketing/lib/scroll-progress";

export type ScrollStoryStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  imageSrc: string;
  imageAlt: string;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ScrollStory = ({
  id,
  className,
  steps,
}: {
  id?: string;
  className?: string;
  steps: ScrollStoryStep[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { progress } = useScrollProgress(containerRef);

  const { index, mix } = useMemo(() => computeStepMix(progress, steps.length), [progress, steps.length]);
  const current = steps[Math.min(steps.length - 1, Math.max(0, index))];
  const next = steps[Math.min(steps.length - 1, Math.max(0, index + 1))];

  if (!steps.length) return null;

  if (prefersReducedMotion) {
    return (
      <section id={id} className={cn("py-20", className)} data-scrolly="reduced">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {steps.map((step) => (
            <div key={step.id} className="grid gap-6 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{step.eyebrow}</div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{step.title}</div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
                <ul className="pt-2 space-y-1 text-sm text-muted-foreground">
                  {step.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-7">
                <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur shadow-soft aspect-[16/10]">
                  <Image src={step.imageSrc} alt={step.imageAlt} fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const heightVh = Math.max(220, steps.length * 90);

  const currentOpacity = lerp(1, 0, mix);
  const nextOpacity = lerp(0, 1, mix);

  return (
    <section
      id={id}
      ref={containerRef}
      className={cn("relative border-y border-white/50 bg-gradient-to-b from-white/55 via-background to-white/55", className)}
      style={{ minHeight: `${heightVh}vh` }}
      data-scrolly="scrub"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 [background-image:radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_80%_40%,rgba(34,211,238,0.14),transparent_58%)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sticky top-[92px] sm:top-[104px] py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-12 items-start">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-[11px] font-semibold text-muted-foreground shadow-soft">
                <span className="text-primary font-extrabold tabular-nums">{Math.round(progress * 100)}%</span>
                Scroll to play
              </div>

              <div className="mt-6 relative">
                <div
                  className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur shadow-soft p-6 sm:p-7"
                  style={{
                    transform: `translateY(${lerp(0, -10, mix)}px)`,
                    opacity: currentOpacity,
                  }}
                >
                  <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{current.eyebrow}</div>
                  <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{current.title}</div>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{current.description}</p>
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                    {current.bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                </div>

                {next && next.id !== current.id ? (
                  <div
                    className="absolute inset-0 rounded-3xl border border-white/60 bg-white/70 backdrop-blur shadow-soft p-6 sm:p-7"
                    style={{
                      transform: `translateY(${lerp(10, 0, mix)}px)`,
                      opacity: nextOpacity,
                      pointerEvents: "none",
                    }}
                    aria-hidden="true"
                  >
                    <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary">{next.eyebrow}</div>
                    <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{next.title}</div>
                    <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{next.description}</p>
                    <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                      {next.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {steps.map((step, i) => {
                  const active = i === index;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                        active ? "border-primary/40 bg-white text-foreground shadow-soft" : "border-white/60 bg-white/60 text-muted-foreground hover:bg-white/80",
                      )}
                      onClick={() => {
                        const el = containerRef.current;
                        if (!el) return;
                        const rect = el.getBoundingClientRect();
                        const scrollable = el.scrollHeight - window.innerHeight;
                        if (scrollable <= 0) return;
                        const target = (i / Math.max(1, steps.length - 1)) * scrollable;
                        window.scrollTo({ top: window.scrollY + rect.top + target, behavior: "smooth" });
                      }}
                      aria-label={`Jump to ${step.title}`}
                    >
                      {step.eyebrow}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 backdrop-blur shadow-2xl aspect-[16/10]">
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: currentOpacity,
                    transform: `scale(${lerp(1, 1.015, mix)})`,
                    filter: `saturate(${lerp(1.02, 1, mix)})`,
                  }}
                >
                  <Image src={current.imageSrc} alt={current.imageAlt} fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
                </div>

                {next && next.id !== current.id ? (
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: nextOpacity,
                      transform: `scale(${lerp(0.985, 1, mix)})`,
                    }}
                    aria-hidden="true"
                  >
                    <Image src={next.imageSrc} alt={next.imageAlt} fill sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
                  </div>
                ) : null}

                <div className="absolute inset-0 bg-gradient-to-r from-background/65 via-background/10 to-transparent pointer-events-none" />
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Scroll-driven preview • scrub to refine • no “play” button needed
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

