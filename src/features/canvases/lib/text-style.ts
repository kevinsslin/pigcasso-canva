export const TEXT_FONT_OPTIONS = [
  { id: "draw", label: "Draw" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
] as const;

export const TEXT_FONT_FAMILY_PRESETS = [
  {
    id: "pigcasso",
    label: "Pigcasso (Nunito)",
    value:
      "var(--font-display), var(--font-tc), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  {
    id: "system",
    label: "System Sans",
    value:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  {
    id: "tc",
    label: "Noto Sans TC",
    value:
      "var(--font-tc), var(--font-display), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    value: "ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif",
  },
  {
    id: "mono",
    label: "Mono",
    value:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
  },
] as const;

export const TEXT_SIZE_OPTIONS = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
] as const;

export type CanvasTextSize = (typeof TEXT_SIZE_OPTIONS)[number]["id"];

export const PIGCASSO_TEXT_FONT_FAMILY_META_KEY = "pigcassoFontFamily";

export const TEXT_SIZE_BASE_PX: Record<CanvasTextSize, number> = {
  s: 18,
  m: 24,
  l: 36,
  xl: 44,
};

export const clampCanvasTextScale = (scale: number) => {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(100, Math.max(0.05, scale));
};

export const getCanvasTextSizePx = (size: CanvasTextSize, scale: number) => {
  const base = TEXT_SIZE_BASE_PX[size] ?? TEXT_SIZE_BASE_PX.m;
  return Math.max(1, Math.round(base * clampCanvasTextScale(scale)));
};

export const pickCanvasTextSizeAndScaleFromPx = (px: number) => {
  const target = Number(px);
  if (!Number.isFinite(target) || target <= 0) {
    return { size: "m" as const, scale: 1 };
  }

  const sizeIds = Object.keys(TEXT_SIZE_BASE_PX) as CanvasTextSize[];
  const candidates = sizeIds.map((size) => {
    const base = TEXT_SIZE_BASE_PX[size];
    const rawScale = target / base;
    const scale = clampCanvasTextScale(rawScale);
    const rendered = base * scale;
    const error = Math.abs(target - rendered);
    return { size, scale: Number(scale.toFixed(4)), error, scaleDelta: Math.abs(1 - scale) };
  });

  candidates.sort((a, b) => a.error - b.error || a.scaleDelta - b.scaleDelta);
  return { size: candidates[0].size, scale: candidates[0].scale };
};

export const TEXT_COLOR_OPTIONS = [
  { id: "black", label: "Black", className: "bg-black" },
  { id: "white", label: "White", className: "bg-white" },
  { id: "grey", label: "Gray", className: "bg-zinc-500" },
  { id: "red", label: "Red", className: "bg-red-500" },
  { id: "orange", label: "Orange", className: "bg-orange-500" },
  { id: "yellow", label: "Yellow", className: "bg-yellow-400" },
  { id: "green", label: "Green", className: "bg-green-500" },
  { id: "blue", label: "Blue", className: "bg-blue-500" },
  { id: "violet", label: "Violet", className: "bg-violet-500" },
] as const;

export const toRichTextValue = (text: string) => {
  const lines = (text ?? "").split("\n");
  return {
    type: "doc",
    content: lines.map((line) =>
      line
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" },
    ),
  } as any;
};

export const pickTextSizeFromHeight = (height: number) => {
  if (height < 22) return "s";
  if (height < 32) return "m";
  if (height < 52) return "l";
  return "xl";
};
