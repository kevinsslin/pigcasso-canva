export const MANTLE_CAIP2 = "eip155:5000";
export const MANTLE_EXPLORER_BASE_URL = "https://explorer.mantle.xyz";

const DEFAULT_TOKEN_URL_TEMPLATE = "https://app.printr.money/token/{tokenId}";

const getTokenUrlTemplate = () =>
  process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE?.trim() ?? "";

export const buildPrintrTokenUrl = (tokenId: string) => {
  const fallback = DEFAULT_TOKEN_URL_TEMPLATE.replaceAll("{tokenId}", encodeURIComponent(tokenId));

  const template = getTokenUrlTemplate();
  if (!template) {
    return fallback;
  }

  const url = template.replaceAll("{tokenId}", encodeURIComponent(tokenId));

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
