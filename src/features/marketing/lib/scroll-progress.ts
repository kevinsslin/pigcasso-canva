export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const computeScrollProgress = (input: { rectTop: number; rectHeight: number; viewportHeight: number }) => {
  const rectTop = Number(input.rectTop);
  const rectHeight = Number(input.rectHeight);
  const viewportHeight = Number(input.viewportHeight);

  if (!Number.isFinite(rectTop) || !Number.isFinite(rectHeight) || !Number.isFinite(viewportHeight)) return 0;
  if (rectHeight <= 0 || viewportHeight <= 0) return 0;

  const scrollable = rectHeight - viewportHeight;
  if (scrollable <= 0) return 0;

  const offset = -rectTop;
  return clamp01(offset / scrollable);
};

export const computeStepMix = (progress: number, stepsCount: number) => {
  const count = Math.max(1, Math.floor(stepsCount));
  const t = clamp01(progress) * (count - 1);
  const index = Math.min(count - 1, Math.max(0, Math.floor(t)));
  const mix = clamp01(t - index);
  return { index, mix };
};

