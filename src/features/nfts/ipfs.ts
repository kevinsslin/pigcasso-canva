import { getIpfsGatewayBaseUrl, normalizeIpfsGatewayBase } from "@/lib/ipfs-gateway";
import { normalizeIpfsUrl } from "@/lib/ipfs";

export const getIpfsGatewayBase = () => normalizeIpfsGatewayBase(process.env.NEXT_PUBLIC_IPFS_GATEWAY);

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
