const DEFAULT_IPFS_GATEWAY_BASE = "https://gateway.pinata.cloud/ipfs/";

const ensureScheme = (value: string) => {
  if (value.startsWith("//")) return `https:${value}`;
  if (value.includes("://")) return value;
  return `https://${value}`;
};

export const normalizeIpfsGatewayBase = (raw: string | null | undefined) => {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return DEFAULT_IPFS_GATEWAY_BASE;

  try {
    const url = new URL(ensureScheme(trimmed));
    url.search = "";
    url.hash = "";

    const pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "/") {
      url.pathname = "/ipfs/";
      return url.toString();
    }

    if (pathname === "/ipfs" || pathname.startsWith("/ipfs/")) {
      url.pathname = `${pathname}/`.replace(/\/+$/, "/");
      return url.toString();
    }

    url.pathname = `${pathname}/`.replace(/\/+$/, "/");
    return url.toString();
  } catch {
    return DEFAULT_IPFS_GATEWAY_BASE;
  }
};

export const getIpfsGatewayBase = () => normalizeIpfsGatewayBase(process.env.NEXT_PUBLIC_IPFS_GATEWAY);

export const getIpfsGatewayBaseUrl = () => {
  const base = getIpfsGatewayBase();
  try {
    return new URL(base).origin;
  } catch {
    return "https://gateway.pinata.cloud";
  }
};

