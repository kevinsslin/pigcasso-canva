export const MANTLE_CAIP2 = "eip155:5000";
export const MANTLE_EXPLORER_BASE_URL = "https://explorer.mantle.xyz";

const DEFAULT_TOKEN_URL_TEMPLATE = "https://app.printr.money/trade/{tokenId}";

const getTokenUrlTemplate = () =>
  process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE?.trim() ?? "";

const normalizePrintrTokenId = (tokenId: string) => {
  const trimmed = tokenId.trim();
  if (!trimmed) return "";
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
};

export const buildPrintrTokenUrl = (tokenId: string) => {
  const normalizedTokenId = normalizePrintrTokenId(tokenId);
  const encodedTokenId = encodeURIComponent(normalizedTokenId);
  const fallback = DEFAULT_TOKEN_URL_TEMPLATE.replaceAll("{tokenId}", encodedTokenId);

  const template = getTokenUrlTemplate();
  if (!template) {
    return fallback;
  }

  const url = template.replace(/\{token_?id\}/gi, encodedTokenId);
  if (url === template) {
    return fallback;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
};
