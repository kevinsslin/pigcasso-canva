import { getAppOrigin } from "@/lib/app-origin";

export const getCanvasShareUrl = (canvasId: string) => {
  const origin = getAppOrigin();
  return `${origin}/canvas/${encodeURIComponent(canvasId)}`;
};

