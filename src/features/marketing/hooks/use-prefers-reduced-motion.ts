"use client";

import { useEffect, useState } from "react";

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(Boolean(query.matches));
    update();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }

    // Safari < 14
    (query as any).addListener?.(update);
    return () => (query as any).removeListener?.(update);
  }, []);

  return reduced;
};
