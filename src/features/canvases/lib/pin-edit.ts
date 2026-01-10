export type PinEditTrigger = "alt" | "pin";

export const getPinEditTrigger = (opts: { altKey: boolean; armed: boolean }): PinEditTrigger | null => {
  if (opts.altKey) return "alt";
  if (opts.armed) return "pin";
  return null;
};

export const isClickWithinThreshold = (opts: { dx: number; dy: number; threshold?: number }): boolean => {
  const threshold = opts.threshold ?? 6;
  return Math.hypot(opts.dx, opts.dy) <= threshold;
};

