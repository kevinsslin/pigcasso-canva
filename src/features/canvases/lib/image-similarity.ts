const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });

const drawToCanvas = async (src: string, size: number) => {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("Canvas is not available in this environment.");
  }

  const trimmed = src.trim();
  if (!trimmed) throw new Error("Missing image source.");

  const img = await loadImage(trimmed);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Missing canvas context.");

  const w = img.naturalWidth || img.width || size;
  const h = img.naturalHeight || img.height || size;
  if (!w || !h) throw new Error("Image loaded without dimensions.");

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const scale = Math.min(size / w, size / h);
  const dw = w * scale;
  const dh = h * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
  return ctx.getImageData(0, 0, size, size).data;
};

export const computeImageSimilarityScore = async (a: string, b: string, options?: { size?: number }) => {
  const size = Math.max(24, Math.min(160, Math.floor(options?.size ?? 96)));
  const [aPixels, bPixels] = await Promise.all([drawToCanvas(a, size), drawToCanvas(b, size)]);

  const len = Math.min(aPixels.length, bPixels.length);
  if (!len) return null;

  let sum = 0;
  for (let i = 0; i < len; i += 4) {
    const ar = aPixels[i] ?? 0;
    const ag = aPixels[i + 1] ?? 0;
    const ab = aPixels[i + 2] ?? 0;
    const br = bPixels[i] ?? 0;
    const bg = bPixels[i + 1] ?? 0;
    const bb = bPixels[i + 2] ?? 0;
    sum += Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb);
  }

  const max = (len / 4) * 3 * 255;
  if (!max) return null;
  const diff = sum / max;
  return clamp01(1 - diff);
};

