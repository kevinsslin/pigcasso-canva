import { getIpfsGatewayBaseUrl, normalizeIpfsGatewayBase } from "@/lib/ipfs-gateway";
import { normalizeIpfsUrl } from "@/lib/ipfs";

export const getIpfsGatewayBase = () => normalizeIpfsGatewayBase(process.env.NEXT_PUBLIC_IPFS_GATEWAY);

const PUBLIC_IPFS_IO_BASE = "https://ipfs.io";

export const ipfsToHttpUrl = (uri: string | null | undefined) => {
  const trimmed = (uri ?? "").trim();
  if (!trimmed) return null;

  const normalized = normalizeIpfsUrl(trimmed, {
    defaultGatewayBaseUrl: getIpfsGatewayBaseUrl(),
  });

  if (!normalized) return null;
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  return null;
};

export const ipfsToPublicHttpUrl = (uri: string | null | undefined) => {
  const trimmed = (uri ?? "").trim();
  if (!trimmed) return null;

  const normalized = normalizeIpfsUrl(trimmed, {
    defaultGatewayBaseUrl: PUBLIC_IPFS_IO_BASE,
  });

  if (!normalized) return null;
  if (/^(https?:|data:|blob:)/i.test(normalized)) return normalized;
  return null;
};
