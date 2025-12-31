"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type TiltProps = React.HTMLAttributes<HTMLDivElement> & {
  max?: number;
  perspective?: number;
  scale?: number;
  disabled?: boolean;
};

const addMediaListener = (media: MediaQueryList, listener: () => void) => {
  const handler = () => listener();
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
};

export const Tilt = ({
  className,
  children,
  max = 8,
  perspective = 900,
  scale = 1.02,
  disabled,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  style,
  ...props
}: TiltProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (disabled) {
      setEnabled(false);
      return;
    }

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => setEnabled(hoverQuery.matches && !motionQuery.matches);
    update();

    const cleanups = [
      addMediaListener(hoverQuery, update),
      addMediaListener(motionQuery, update),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [disabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const resetTransform = () => {
    const element = elementRef.current;
    if (!element) return;
    element.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;
  };

  const schedule = () => {
    if (rafRef.current) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      const element = elementRef.current;
      const pointer = pointerRef.current;
      if (!element || !pointer) return;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = (pointer.x - rect.left) / rect.width;
      const y = (pointer.y - rect.top) / rect.height;

      const rotateY = (x - 0.5) * (max * 2);
      const rotateX = (0.5 - y) * (max * 2);

      element.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(
        2,
      )}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${scale})`;
    });
  };

  const handlePointerEnter: React.PointerEventHandler<HTMLDivElement> = (event) => {
    onPointerEnter?.(event);
    if (!enabled) return;
    resetTransform();
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    onPointerMove?.(event);
    if (!enabled) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    schedule();
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLDivElement> = (event) => {
    onPointerLeave?.(event);
    if (!enabled) return;
    pointerRef.current = null;
    resetTransform();
  };

  return (
    <div
      ref={elementRef}
      className={cn(
        "will-change-transform motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
        className,
      )}
      onPointerEnter={enabled ? handlePointerEnter : onPointerEnter}
      onPointerMove={enabled ? handlePointerMove : onPointerMove}
      onPointerLeave={enabled ? handlePointerLeave : onPointerLeave}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
