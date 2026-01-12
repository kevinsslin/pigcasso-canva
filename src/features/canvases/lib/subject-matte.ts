export type SubjectMatteOptions = {
  minAlpha?: number;
  maxAlpha?: number;
  minThreshold?: number;
  maxThreshold?: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const colorDiff = (aR: number, aG: number, aB: number, bR: number, bG: number, bB: number) => {
  const dr = aR - bR;
  const dg = aG - bG;
  const db = aB - bB;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const computeAdaptiveThreshold = (diffs: Float32Array, options?: SubjectMatteOptions) => {
  if (!diffs.length) return 24;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < diffs.length; i += 1) {
    const v = diffs[i] ?? 0;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / diffs.length;
  const variance = Math.max(0, sumSq / diffs.length - mean * mean);
  const std = Math.sqrt(variance);
  const raw = mean + std * 1.6;
  return clamp(raw, options?.minThreshold ?? 14, options?.maxThreshold ?? 64);
};

export const computeSubjectMatteFromPixels = (params: {
  foreground: Uint8ClampedArray;
  background: Uint8ClampedArray;
  width: number;
  height: number;
  options?: SubjectMatteOptions;
}) => {
  const { foreground, background } = params;
  const width = Math.max(1, Math.floor(params.width));
  const height = Math.max(1, Math.floor(params.height));
  const total = width * height;
  if (foreground.length < total * 4 || background.length < total * 4) {
    return { data: foreground, changed: false, opaqueRatio: 1 };
  }

  const diffs = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const o = i * 4;
    diffs[i] = colorDiff(
      foreground[o] ?? 0,
      foreground[o + 1] ?? 0,
      foreground[o + 2] ?? 0,
      background[o] ?? 0,
      background[o + 1] ?? 0,
      background[o + 2] ?? 0,
    );
  }

  const threshold = computeAdaptiveThreshold(diffs, params.options);
  const minAlpha = clamp(params.options?.minAlpha ?? 0, 0, 254);
  const maxAlpha = clamp(params.options?.maxAlpha ?? 255, minAlpha + 1, 255);
  const knee = clamp(threshold * 2.2, threshold + 4, 220);

  const out = new Uint8ClampedArray(foreground);
  let opaque = 0;

  for (let i = 0; i < total; i += 1) {
    const diff = diffs[i] ?? 0;
    const o = i * 4;

    if (diff <= threshold) {
      out[o + 3] = 0;
      continue;
    }

    const t = clamp((diff - threshold) / (knee - threshold), 0, 1);
    const alpha = Math.round(minAlpha + t * (maxAlpha - minAlpha));
    out[o + 3] = alpha;
    if (alpha >= 20) opaque += 1;
  }

  const opaqueRatio = total ? opaque / total : 0;
  return { data: out, changed: true, opaqueRatio };
};

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });

export const extractSubjectByBackgroundDiffDataUrl = async (params: {
  foregroundDataUrl: string;
  backgroundDataUrl: string;
  options?: SubjectMatteOptions;
}) => {
  if (typeof document === "undefined") {
    return { dataUrl: params.foregroundDataUrl, changed: false, opaqueRatio: null };
  }
  const foregroundDataUrl = params.foregroundDataUrl;
  const backgroundDataUrl = params.backgroundDataUrl;
  if (!foregroundDataUrl.startsWith("data:") || !backgroundDataUrl.startsWith("data:")) {
    return { dataUrl: foregroundDataUrl, changed: false, opaqueRatio: null };
  }

  const [fgImg, bgImg] = await Promise.all([loadImage(foregroundDataUrl), loadImage(backgroundDataUrl)]);
  const width = fgImg.naturalWidth || fgImg.width;
  const height = fgImg.naturalHeight || fgImg.height;
  if (!width || !height) return { dataUrl: foregroundDataUrl, changed: false, opaqueRatio: null };

  const fgCanvas = document.createElement("canvas");
  fgCanvas.width = width;
  fgCanvas.height = height;
  const fgCtx = fgCanvas.getContext("2d");
  if (!fgCtx) return { dataUrl: foregroundDataUrl, changed: false, opaqueRatio: null };
  fgCtx.clearRect(0, 0, width, height);
  fgCtx.drawImage(fgImg, 0, 0, width, height);
  const fgImage = fgCtx.getImageData(0, 0, width, height);

  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d");
  if (!bgCtx) return { dataUrl: foregroundDataUrl, changed: false, opaqueRatio: null };
  bgCtx.clearRect(0, 0, width, height);
  bgCtx.drawImage(bgImg, 0, 0, width, height);
  const bgImage = bgCtx.getImageData(0, 0, width, height);

  const matte = computeSubjectMatteFromPixels({
    foreground: fgImage.data,
    background: bgImage.data,
    width,
    height,
    options: params.options,
  });

  if (!matte.changed) return { dataUrl: foregroundDataUrl, changed: false, opaqueRatio: null };
  fgCtx.putImageData(new ImageData(matte.data, width, height), 0, 0);
  return { dataUrl: fgCanvas.toDataURL("image/png"), changed: true, opaqueRatio: matte.opaqueRatio };
};

