import { normalizeIpfsGatewayBase } from "@/lib/ipfs-gateway";

const PROXY_PATH = "/api/images/proxy";

const STATIC_ALLOWED_HOSTS = new Set([
  "utfs.io",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "gateway.pinata.cloud",
  "cloudflare-ipfs.com",
  "ipfs.io",
  "nftstorage.link",
  "w3s.link",
  "dweb.link",
  "arweave.net",
]);

const getDynamicAllowedHosts = () => {
  const raw = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.trim();
  if (!raw) return [];
  try {
    const url = new URL(normalizeIpfsGatewayBase(raw));
    return url.hostname ? [url.hostname.toLowerCase()] : [];
  } catch {
    return [];
  }
};

const isAllowedProxyHost = (hostname: string) => {
  const host = hostname.toLowerCase();

  if (host === "ufs.sh" || host.endsWith(".ufs.sh")) return true;
  if (host.endsWith(".mypinata.cloud")) return true;
  if (STATIC_ALLOWED_HOSTS.has(host)) return true;

  const dynamicHosts = getDynamicAllowedHosts();
  return dynamicHosts.includes(host);
};

export const buildCanvasImageProxyUrl = (rawUrl: string) => `${PROXY_PATH}?url=${encodeURIComponent(rawUrl.trim())}`;

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

  if (!isAllowedProxyHost(url.hostname)) return trimmed;

  return buildCanvasImageProxyUrl(url.toString());
};
