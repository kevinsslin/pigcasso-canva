const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export const getIpfsGatewayBase = () => {
  const raw = process.env.NEXT_PUBLIC_IPFS_GATEWAY?.trim();
  if (raw && raw.length > 0) {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }
  return DEFAULT_GATEWAY;
};

export const ipfsToHttpUrl = (uri: string | null | undefined) => {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("ipfs://")) {
    const cid = trimmed.replace("ipfs://", "");
    return `${getIpfsGatewayBase()}${cid}`;
  }

  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }

  return null;
};

