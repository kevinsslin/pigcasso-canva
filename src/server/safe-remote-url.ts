import { HttpError } from "@/server/http-error";

const STATIC_ALLOWED_HOSTS = [
  "utfs.io",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "gateway.pinata.cloud",
  "ipfs.io",
  "replicate.delivery",
];

const getDynamicAllowedHosts = () => {
  const raw = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.trim();
  if (!raw) return [];

  try {
    const url = new URL(raw);
    return url.hostname ? [url.hostname.toLowerCase()] : [];
  } catch {
    return [];
  }
};

export const isAllowedRemoteHost = (hostname: string) => {
  const host = hostname.toLowerCase();

  if (host === "ufs.sh" || host.endsWith(".ufs.sh")) {
    return true;
  }

  if (STATIC_ALLOWED_HOSTS.includes(host)) {
    return true;
  }

  const dynamicHosts = getDynamicAllowedHosts();
  return dynamicHosts.includes(host);
};

export const assertSafeRemoteUrl = (value: string, fallbackMessage = "Invalid URL") => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, fallbackMessage);
  }

  if (url.protocol !== "https:") {
    throw new HttpError(400, "URL must use https");
  }

  if (!isAllowedRemoteHost(url.hostname)) {
    throw new HttpError(400, "Unsupported URL host");
  }

  return url;
};

