const PROXY_PATH = "/api/images/proxy";

export const buildCanvasImageProxyUrl = (rawUrl: string) => `${PROXY_PATH}?url=${encodeURIComponent(rawUrl)}`;

export const isCanvasImageProxyUrl = (rawUrl: string) => {
  if (!rawUrl) return false;
  if (rawUrl.startsWith(PROXY_PATH)) return true;

  try {
    const url = new URL(rawUrl);
    return url.pathname === PROXY_PATH;
  } catch {
    return false;
  }
};

export const toCanvasImageUrl = (rawUrl: string, appHostname?: string | null) => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  if (isCanvasImageProxyUrl(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (url.protocol !== "https:") return trimmed;

  const hostname =
    appHostname ??
    (typeof window !== "undefined" ? window.location.hostname : null);
  if (hostname && url.hostname.toLowerCase() === hostname.toLowerCase()) {
    return trimmed;
  }

  return buildCanvasImageProxyUrl(url.toString());
};

