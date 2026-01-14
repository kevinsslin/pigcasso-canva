export type RgbColor = { r: number; g: number; b: number };

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const colorDistance = (a: RgbColor, b: RgbColor) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const isNearGrayscale = (c: RgbColor, tolerance = 14) =>
  Math.abs(c.r - c.g) <= tolerance && Math.abs(c.r - c.b) <= tolerance && Math.abs(c.g - c.b) <= tolerance;

const brightness = (c: RgbColor) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

const getPixel = (data: Uint8ClampedArray, i: number): RgbColor => {
  const o = i * 4;
  return { r: data[o] ?? 0, g: data[o + 1] ?? 0, b: data[o + 2] ?? 0 };
};

export const hasAnyTransparency = (data: Uint8ClampedArray) => {
  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 255) < 255) return true;
  }
  return false;
};

export const estimateOpaquePixelRatio = (data: Uint8ClampedArray, alphaThreshold = 20) => {
  if (!data.length) return 0;
  const threshold = Math.max(1, Math.min(254, Math.floor(alphaThreshold)));
  let opaque = 0;
  const total = Math.floor(data.length / 4);

  for (let i = 3; i < data.length; i += 4) {
    if ((data[i] ?? 0) >= threshold) opaque += 1;
  }

  if (!total) return 0;
  return opaque / total;
};

type ColorCluster = {
  count: number;
  mean: RgbColor;
};

const addToClusters = (clusters: ColorCluster[], color: RgbColor, threshold: number) => {
  for (const cluster of clusters) {
    if (colorDistance(cluster.mean, color) <= threshold) {
      const nextCount = cluster.count + 1;
      cluster.mean = {
        r: (cluster.mean.r * cluster.count + color.r) / nextCount,
        g: (cluster.mean.g * cluster.count + color.g) / nextCount,
        b: (cluster.mean.b * cluster.count + color.b) / nextCount,
      };
      cluster.count = nextCount;
      return;
    }
  }
  clusters.push({ count: 1, mean: { ...color } });
};

const pickBackgroundColorsFromBorder = (params: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}) => {
  const { data, width, height } = params;
  const clusters: ColorCluster[] = [];

  const step = Math.max(1, Math.floor(Math.min(width, height) / 48));
  const addSample = (x: number, y: number) => {
    const idx = y * width + x;
    addToClusters(clusters, getPixel(data, idx), 12);
  };

  for (let x = 0; x < width; x += step) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = 0; y < height; y += step) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  clusters.sort((a, b) => b.count - a.count);
  const top = clusters.slice(0, 3).map((c) => ({
    r: clampByte(c.mean.r),
    g: clampByte(c.mean.g),
    b: clampByte(c.mean.b),
    count: c.count,
  }));

  return top;
};

const looksLikeTransparencyGrid = (colors: Array<RgbColor & { count?: number }>) => {
  const candidates = colors.slice(0, 2);
  if (candidates.length < 1) return false;

  const brightEnough = candidates.every((c) => brightness(c) >= 160);
  const grayscale = candidates.every((c) => isNearGrayscale(c));

  if (candidates.length === 1) return brightEnough && grayscale;

  const d = colorDistance(candidates[0], candidates[1]);
  return brightEnough && grayscale && d >= 8 && d <= 90;
};

export const stripFakeTransparencyGrid = (params: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorTolerance?: number;
  minCoverageRatio?: number;
}) => {
  const { data, width, height } = params;
  const colorTolerance = Math.max(1, Math.floor(params.colorTolerance ?? 26));
  const minCoverageRatio = Math.min(0.95, Math.max(0.01, params.minCoverageRatio ?? 0.12));

  if (width <= 1 || height <= 1) return { data, changed: false };
  if (hasAnyTransparency(data)) return { data, changed: false };

  const borderClusters = pickBackgroundColorsFromBorder({ data, width, height });
  const bgColors = borderClusters
    .slice(0, 2)
    .map((c) => ({ r: c.r, g: c.g, b: c.b }));

  if (!looksLikeTransparencyGrid(borderClusters)) {
    return { data, changed: false };
  }

  const isBgLike = (idx: number) => {
    const px = getPixel(data, idx);
    return bgColors.some((bg) => colorDistance(px, bg) <= colorTolerance);
  };

  const total = width * height;
  const visited = new Uint8Array(total);
  const queue: number[] = [];
  const push = (idx: number) => {
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (!visited[top] && isBgLike(top)) push(top);
    if (!visited[bottom] && isBgLike(bottom)) push(bottom);
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!visited[left] && isBgLike(left)) push(left);
    if (!visited[right] && isBgLike(right)) push(right);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++] ?? 0;
    const x = idx % width;
    const y = (idx / width) | 0;

    const neighbors: number[] = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);

    for (const next of neighbors) {
      if (visited[next]) continue;
      if (!isBgLike(next)) continue;
      push(next);
    }
  }

  const coverage = queue.length / total;
  if (!Number.isFinite(coverage) || coverage < minCoverageRatio) {
    return { data, changed: false };
  }

  const next = new Uint8ClampedArray(data);
  for (let i = 0; i < visited.length; i++) {
    if (!visited[i]) continue;
    next[i * 4 + 3] = 0;
  }
  return { data: next, changed: true };
};

const loadImageFromDataUrl = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });

export const getOpaquePixelRatioFromDataUrl = async (dataUrl: string, alphaThreshold = 20) => {
  if (typeof document === "undefined") return null;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;

  const img = await loadImageFromDataUrl(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return estimateOpaquePixelRatio(imageData.data, alphaThreshold);
};

export const ensureTransparentPngDataUrl = async (dataUrl: string) => {
  if (typeof document === "undefined") return { dataUrl, changed: false };
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return { dataUrl, changed: false };

  const img = await loadImageFromDataUrl(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return { dataUrl, changed: false };

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl, changed: false };

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const stripped = stripFakeTransparencyGrid({ data: imageData.data, width, height });
  if (!stripped.changed) return { dataUrl, changed: false };

  ctx.putImageData(new ImageData(stripped.data, width, height), 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), changed: true };
};

type BinaryMask = Uint8Array;

const createNeighborOffsets = (radius: number) => {
  const r = Math.max(0, Math.floor(radius));
  const offsets: Array<{ dx: number; dy: number }> = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      offsets.push({ dx, dy });
    }
  }
  return offsets;
};

const dilateBinaryMask = (mask: BinaryMask, width: number, height: number, radius: number) => {
  const offsets = createNeighborOffsets(radius);
  const total = width * height;
  const next = new Uint8Array(total);
  if (!total) return next;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (mask[idx]) {
        next[idx] = 1;
        continue;
      }

      let found = false;
      for (const { dx, dy } of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (mask[ny * width + nx]) {
          found = true;
          break;
        }
      }
      next[idx] = found ? 1 : 0;
    }
  }
  return next;
};

const erodeBinaryMask = (mask: BinaryMask, width: number, height: number, radius: number) => {
  const offsets = createNeighborOffsets(radius);
  const total = width * height;
  const next = new Uint8Array(total);
  if (!total) return next;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (!mask[idx]) {
        next[idx] = 0;
        continue;
      }

      let ok = true;
      for (const { dx, dy } of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          ok = false;
          break;
        }
        if (!mask[ny * width + nx]) {
          ok = false;
          break;
        }
      }
      next[idx] = ok ? 1 : 0;
    }
  }
  return next;
};

export const closeBinaryMask = (mask: BinaryMask, width: number, height: number, radius: number) => {
  const r = Math.max(0, Math.floor(radius));
  if (r <= 0) return new Uint8Array(mask);
  const dilated = dilateBinaryMask(mask, width, height, r);
  return erodeBinaryMask(dilated, width, height, r);
};

export const fillBinaryMaskHoles = (mask: BinaryMask, width: number, height: number) => {
  const total = width * height;
  const next = new Uint8Array(mask);
  if (!total) return { mask: next, filled: 0 };

  const visited = new Uint8Array(total);
  const queue: number[] = [];
  const push = (idx: number) => {
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (!next[top] && !visited[top]) push(top);
    if (!next[bottom] && !visited[bottom]) push(bottom);
  }
  for (let y = 0; y < height; y += 1) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (!next[left] && !visited[left]) push(left);
    if (!next[right] && !visited[right]) push(right);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++] ?? 0;
    const x = idx % width;
    const y = (idx / width) | 0;

    if (x > 0) {
      const n = idx - 1;
      if (!next[n] && !visited[n]) push(n);
    }
    if (x < width - 1) {
      const n = idx + 1;
      if (!next[n] && !visited[n]) push(n);
    }
    if (y > 0) {
      const n = idx - width;
      if (!next[n] && !visited[n]) push(n);
    }
    if (y < height - 1) {
      const n = idx + width;
      if (!next[n] && !visited[n]) push(n);
    }
  }

  let filled = 0;
  for (let i = 0; i < total; i += 1) {
    if (next[i]) continue;
    if (visited[i]) continue;
    next[i] = 1;
    filled += 1;
  }
  return { mask: next, filled };
};

export const getBinaryMaskBoundingBox = (mask: BinaryMask, width: number, height: number) => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (!mask[idx]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
};

const loadImageFromSrc = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.crossOrigin = "anonymous";
    img.src = src;
  });

export const repairTransparentCutoutDataUrl = async (params: {
  cutoutDataUrl: string;
  originalSrc?: string;
  alphaThreshold?: number;
  closeRadius?: number;
}) => {
  if (typeof document === "undefined") {
    return { dataUrl: params.cutoutDataUrl, changed: false, filledPixels: 0, filledRatio: 0 };
  }
  const cutoutDataUrl = params.cutoutDataUrl;
  if (typeof cutoutDataUrl !== "string" || !cutoutDataUrl.startsWith("data:")) {
    return { dataUrl: cutoutDataUrl, changed: false, filledPixels: 0, filledRatio: 0 };
  }

  const alphaThreshold = Math.max(1, Math.min(254, Math.floor(params.alphaThreshold ?? 20)));
  const closeRadius = Math.max(0, Math.floor(params.closeRadius ?? 2));

  const cutoutImg = await loadImageFromDataUrl(cutoutDataUrl);
  const width = cutoutImg.naturalWidth || cutoutImg.width;
  const height = cutoutImg.naturalHeight || cutoutImg.height;
  if (!width || !height) return { dataUrl: cutoutDataUrl, changed: false, filledPixels: 0, filledRatio: 0 };

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: cutoutDataUrl, changed: false, filledPixels: 0, filledRatio: 0 };

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(cutoutImg, 0, 0, width, height);
  const cutoutImageData = ctx.getImageData(0, 0, width, height);
  const cutoutData = cutoutImageData.data;

  let originalData: Uint8ClampedArray | null = null;
  if (typeof params.originalSrc === "string" && params.originalSrc.trim()) {
    try {
      const originalImg = await loadImageFromSrc(params.originalSrc.trim());
      const originalCanvas = document.createElement("canvas");
      originalCanvas.width = width;
      originalCanvas.height = height;
      const originalCtx = originalCanvas.getContext("2d");
      if (originalCtx) {
        originalCtx.clearRect(0, 0, width, height);
        originalCtx.drawImage(originalImg, 0, 0, width, height);
        originalData = originalCtx.getImageData(0, 0, width, height).data;
      }
    } catch {
      originalData = null;
    }
  }

  const total = width * height;
  const baseMask = new Uint8Array(total);
  for (let i = 0; i < total; i += 1) {
    const a = cutoutData[i * 4 + 3] ?? 0;
    baseMask[i] = a >= alphaThreshold ? 1 : 0;
  }

  const bounds = getBinaryMaskBoundingBox(baseMask, width, height);
  if (!bounds) return { dataUrl: cutoutDataUrl, changed: false, filledPixels: 0, filledRatio: 0 };

  const closed = closeBinaryMask(baseMask, width, height, closeRadius);
  const { mask: filledMask } = fillBinaryMaskHoles(closed, width, height);

  const next = new Uint8ClampedArray(cutoutData);
  let filledPixels = 0;

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const idx = y * width + x;
      if (baseMask[idx]) continue;
      if (!filledMask[idx]) continue;
      const o = idx * 4;

      if (!originalData) {
        const r = next[o] ?? 0;
        const g = next[o + 1] ?? 0;
        const b = next[o + 2] ?? 0;
        const hasSignal = r + g + b > 0;
        if (!hasSignal) continue;
      }

      if (originalData) {
        next[o] = originalData[o] ?? next[o] ?? 0;
        next[o + 1] = originalData[o + 1] ?? next[o + 1] ?? 0;
        next[o + 2] = originalData[o + 2] ?? next[o + 2] ?? 0;
      }
      next[o + 3] = 255;
      filledPixels += 1;
    }
  }

  if (!filledPixels) {
    return { dataUrl: cutoutDataUrl, changed: false, filledPixels: 0, filledRatio: 0 };
  }

  ctx.putImageData(new ImageData(next, width, height), 0, 0);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    changed: true,
    filledPixels,
    filledRatio: filledPixels / Math.max(1, total),
  };
};
