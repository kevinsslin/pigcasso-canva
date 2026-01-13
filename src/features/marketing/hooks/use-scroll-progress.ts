"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { computeScrollProgress } from "@/features/marketing/lib/scroll-progress";

const getViewportHeight = () => (typeof window === "undefined" ? 0 : window.innerHeight || 0);

export const useScrollProgress = (ref: React.RefObject<HTMLElement>) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  const measure = () => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const next = computeScrollProgress({ rectTop: rect.top, rectHeight: rect.height, viewportHeight: getViewportHeight() });
    setProgress(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };

    schedule();

    const onScroll = () => schedule();
    const onResize = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => schedule());
      ro.observe(el);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return useMemo(() => ({ progress }), [progress]);
};

