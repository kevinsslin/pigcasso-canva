"use client";

import { useMemo, useRef } from "react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/features/marketing/hooks/use-prefers-reduced-motion";
import { useInView } from "@/features/marketing/hooks/use-in-view";

type ElementType = keyof JSX.IntrinsicElements;

const tokenizeWords = (text: string) =>
  (text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export const SplitRevealText = ({
  as = "div",
  text,
  className,
  wordClassName,
  staggerMs = 18,
  durationMs = 700,
  once = true,
  rootMargin,
}: {
  as?: ElementType;
  text: string;
  className?: string;
  wordClassName?: string;
  staggerMs?: number;
  durationMs?: number;
  once?: boolean;
  rootMargin?: string;
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, rootMargin });

  const words = useMemo(() => tokenizeWords(text), [text]);
  const Tag = as as any;

  if (prefersReducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={className} aria-label={text}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block overflow-hidden align-top pb-[0.08em]">
            <span
              className={cn(
                "inline-block translate-y-[110%] motion-safe:transition-transform motion-safe:ease-[cubic-bezier(0.2,0.9,0.2,1)]",
                inView ? "translate-y-0" : null,
                wordClassName,
              )}
              style={{
                transitionDelay: `${index * staggerMs}ms`,
                transitionDuration: `${Math.max(0, Math.floor(durationMs))}ms`,
              }}
            >
              {word}
            </span>
            {index < words.length - 1 ? <span aria-hidden="true">&nbsp;</span> : null}
          </span>
        ))}
      </span>
    </Tag>
  );
};

