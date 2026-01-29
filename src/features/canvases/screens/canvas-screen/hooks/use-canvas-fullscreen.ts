"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const useCanvasFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const sync = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;

    try {
      if (document.fullscreenElement) {
        if (typeof document.exitFullscreen === "function") {
          await document.exitFullscreen();
        }
        return;
      }

      const target = document.documentElement;
      if (typeof target.requestFullscreen === "function") {
        await target.requestFullscreen();
        return;
      }

      toast.message("Fullscreen is not supported in this browser.", { duration: 2500 });
    } catch {
      toast.error("Failed to toggle fullscreen.", { duration: 2500 });
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
};
