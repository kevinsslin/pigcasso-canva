const DEFAULT_LABEL = "Marketplace";

const getTemplate = () => process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE?.trim() ?? "";

export const getNftMarketplaceLabel = () => {
  const label = process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LABEL?.trim();
  return label && label.length > 0 ? label : DEFAULT_LABEL;
};

export const buildNftMarketplaceUrl = (params: {
  collectionAddress: string;
  tokenId: string;
}) => {
  const template = getTemplate();
  if (!template) return null;

  const url = template
    .replaceAll("{collectionAddress}", params.collectionAddress)
    .replaceAll("{tokenId}", params.tokenId);

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

