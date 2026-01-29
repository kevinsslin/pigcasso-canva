import type { Context } from "hono";

const IP_HEADERS = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "x-vercel-forwarded-for",
  "x-client-ip",
  "true-client-ip",
  "fastly-client-ip",
] as const;

const normalizeIp = (value: string | null | undefined) => {
  if (!value) return null;
  let ip = value.trim();
  if (!ip) return null;
  ip = ip.replace(/^"(.+)"$/, "$1");
  if (!ip || ip.toLowerCase() === "unknown") return null;

  const bracketMatch = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketMatch) return bracketMatch[1];

  const ipv4PortMatch = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4PortMatch) return ipv4PortMatch[1];

  return ip;
};

const parseForwardedHeader = (value: string | null | undefined) => {
  if (!value) return null;
  const parts = value.split(",");
  for (const part of parts) {
    const match = part.match(/for=([^;]+)/i);
    if (!match) continue;
    const candidate = normalizeIp(match[1]?.trim());
    if (candidate) return candidate;
  }
  return null;
};

const parseForwardedForList = (value: string | null | undefined) => {
  if (!value) return null;
  const entries = value.split(",");
  for (const entry of entries) {
    const candidate = normalizeIp(entry);
    if (candidate) return candidate;
  }
  return null;
};

export const getRequestIp = (c: Context): string | null => {
  for (const header of IP_HEADERS) {
    const value = c.req.header(header);
    const ip =
      header === "x-forwarded-for" ? parseForwardedForList(value) : normalizeIp(value);
    if (ip) return ip;
  }

  const forwarded = parseForwardedHeader(c.req.header("forwarded"));
  if (forwarded) return forwarded;

  return null;
};
