export type CanvasSize = {
  width: number;
  height: number;
};

const GEMINI_ASPECT_RATIOS = [
  { value: "1:1", ratio: 1 },
  { value: "2:3", ratio: 2 / 3 },
  { value: "3:2", ratio: 3 / 2 },
  { value: "3:4", ratio: 3 / 4 },
  { value: "4:3", ratio: 4 / 3 },
  { value: "9:16", ratio: 9 / 16 },
  { value: "16:9", ratio: 16 / 9 },
  { value: "21:9", ratio: 21 / 9 },
] as const;

export const pickGeminiAspectRatio = (canvas: CanvasSize | undefined) => {
  if (!canvas) {
    return undefined;
  }

  if (!Number.isFinite(canvas.width) || !Number.isFinite(canvas.height)) {
    return undefined;
  }

  if (canvas.width <= 0 || canvas.height <= 0) {
    return undefined;
  }

  const ratio = canvas.width / canvas.height;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return undefined;
  }

  type GeminiAspectRatio = (typeof GEMINI_ASPECT_RATIOS)[number];

  let best: GeminiAspectRatio = GEMINI_ASPECT_RATIOS[0];
  let bestDistance = Math.abs(ratio - best.ratio);

  for (const candidate of GEMINI_ASPECT_RATIOS.slice(1)) {
    const distance = Math.abs(ratio - candidate.ratio);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best.value;
};
