"use client";

import { useEffect, useState } from "react";

export const useInView = (
  ref: React.RefObject<Element>,
  options?: { rootMargin?: string; once?: boolean },
) => {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const once = options?.once ?? true;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: options?.rootMargin ?? "0px 0px -20% 0px", threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.once, options?.rootMargin, ref]);

  return inView;
};

