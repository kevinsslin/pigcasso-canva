"use client";

import Image from "next/image";
import { useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import { computeStepMix } from "@/features/marketing/lib/scroll-progress";
import { usePrefersReducedMotion } from "@/features/marketing/hooks/use-prefers-reduced-motion";
import { useScrollProgress } from "@/features/marketing/hooks/use-scroll-progress";
import { SplitRevealText } from "@/features/marketing/components/split-reveal-text";

export type StackedCard = {
  id: string;
  indexLabel: string;
  title: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const StackedCards = ({
  id,
  className,
  heading,
  subheading,
  cards,
}: {
  id?: string;
  className?: string;
  heading: string;
  subheading?: string;
  cards: StackedCard[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { progress } = useScrollProgress(containerRef);

  const { index, mix } = useMemo(() => computeStepMix(progress, cards.length), [cards.length, progress]);

  const getCardStyle = (cardIndex: number) => {
    if (prefersReducedMotion || cards.length <= 1) {
      return { scale: 1, opacity: 1, translateY: 0 };
    }

    const fadedScale = 0.92;
    const fadedOpacity = 0.48;

    if (cardIndex < index) {
      return { scale: fadedScale, opacity: fadedOpacity, translateY: -14 };
    }

    if (cardIndex === index) {
      return {
        scale: lerp(1, fadedScale, mix),
        opacity: lerp(1, fadedOpacity, mix),
        translateY: lerp(0, -14, mix),
      };
    }

    return { scale: 1, opacity: 1, translateY: 0 };
  };

  if (!cards.length) return null;

  const heightVh = prefersReducedMotion ? undefined : Math.max(220, cards.length * 95);

  return (
    <section
      id={id}
      ref={containerRef}
      className={cn("relative overflow-hidden bg-[#121212] text-[#E3E1DC]", className)}
      style={heightVh ? { minHeight: `${heightVh}vh` } : undefined}
    >
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.25),transparent_60%),radial-gradient(circle_at_80%_40%,rgba(34,211,238,0.2),transparent_62%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn(prefersReducedMotion ? "py-16" : "sticky top-[92px] sm:top-[104px] py-14 sm:py-16")}>
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Featured</div>
            <SplitRevealText
              as="h2"
              text={heading}
              className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight"
              wordClassName="will-change-transform"
              staggerMs={18}
              durationMs={760}
            />
            {subheading ? (
              <p className="mt-6 max-w-2xl mx-auto text-sm sm:text-base text-white/60 leading-relaxed">
                {subheading}
              </p>
            ) : null}
          </div>

          <div className={cn("mt-14 space-y-12", prefersReducedMotion ? "" : "pb-[12vh]")}>
            {cards.map((card, i) => {
              const style = getCardStyle(i);
              return (
                <div
                  key={card.id}
                  className={cn(prefersReducedMotion ? "" : "sticky top-[10vh]")}
                  style={{ zIndex: cards.length - i }}
                >
                  <div className="h-[82vh] w-full flex items-center justify-center">
                    <div
                      className="w-full"
                      style={{
                        transform: `translateY(${style.translateY}px) scale(${style.scale})`,
                        opacity: style.opacity,
                        transition: prefersReducedMotion ? undefined : "transform 60ms linear, opacity 60ms linear",
                        willChange: "transform, opacity",
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#181818] shadow-2xl">
                        <div className="p-8 sm:p-10 flex flex-col justify-between gap-8">
                          <div>
                            <div className="text-5xl font-extrabold tracking-tight text-white/15">
                              {card.indexLabel}
                            </div>
                            <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
                              {card.title}
                            </div>
                            <div className="mt-3 text-xs uppercase tracking-[0.3em] text-white/60">
                              {card.subtitle}
                            </div>
                          </div>

                          <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-md">
                            {card.description}
                          </p>

                          <div className="text-xs uppercase tracking-[0.25em] text-white/45">
                            Scroll to compare
                          </div>
                        </div>

                        <div className="relative min-h-[280px] md:min-h-[unset]">
                          <Image
                            src={card.imageSrc}
                            alt={card.imageAlt}
                            fill
                            sizes="(max-width: 768px) 100vw, 60vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

