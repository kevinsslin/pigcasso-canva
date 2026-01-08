const DEFAULT_IPFS_GATEWAY_BASE_URL = "https://ipfs.io";

export type NormalizeIpfsUrlOptions = {
  defaultGatewayBaseUrl?: string;
};

const isDataOrBlobUrl = (value: string) => /^(data:|blob:)/i.test(value);

const stripIpfsScheme = (value: string) => {
  const withoutScheme = value.replace(/^ipfs:\/\//i, "");
  return withoutScheme.replace(/^ipfs\//i, "").replace(/^\/+/, "");
};

const ensureGatewayBaseUrl = (value: string) => value.replace(/\/+$/, "");

const CID_V0_RE = /^Qm[1-9A-HJ-NP-Za-km-z]{44}(\/.*)?$/;
const CID_V1_BASE32_RE = /^b[a-z2-7]{20,}(\/.*)?$/i;

const looksLikeCid = (value: string) => CID_V0_RE.test(value) || CID_V1_BASE32_RE.test(value);

const HOSTNAME_WITH_OPTIONAL_PATH_RE =
  /^[a-z0-9-]+(\.[a-z0-9-]+)+(?:\:\d+)?(?:\/.*)?$/i;

const looksLikeHostnameWithoutScheme = (value: string) =>
  HOSTNAME_WITH_OPTIONAL_PATH_RE.test(value) && !value.includes("://");

const normalizePinataGatewayPath = (url: URL) => {
  if (!url.hostname.endsWith(".mypinata.cloud")) {
    return url;
  }

  if (url.pathname === "/" || url.pathname === "") {
    return url;
  }

  if (
    url.pathname === "/ipfs" ||
    url.pathname.startsWith("/ipfs/") ||
    url.pathname === "/ipns" ||
    url.pathname.startsWith("/ipns/")
  ) {
    return url;
  }

  url.pathname = `/ipfs${url.pathname}`;
  return url;
};

const extractPinataGatewayFromPath = (url: URL) => {
  const match = url.pathname.match(/^\/([a-z0-9-]+\.mypinata\.cloud)(\/.*)$/i);
  if (!match) {
    return null;
  }

  const [, hostname, restPath] = match;
  try {
    const extracted = new URL(`https://${hostname}${restPath}`);
    extracted.search = url.search;
    extracted.hash = url.hash;
    return extracted;
  } catch {
    return null;
  }
};

const normalizeHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    const extractedPinata = extractPinataGatewayFromPath(url);
    if (extractedPinata) {
      return normalizePinataGatewayPath(extractedPinata).toString();
    }
    return normalizePinataGatewayPath(url).toString();
  } catch {
    return value;
  }
};

export const normalizeIpfsUrl = (
  value: string | null | undefined,
  options: NormalizeIpfsUrlOptions = {},
) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (isDataOrBlobUrl(trimmed)) return trimmed;

  if (/^ipfs:\/\//i.test(trimmed)) {
    const path = stripIpfsScheme(trimmed);
    const gatewayBaseUrl = ensureGatewayBaseUrl(
      options.defaultGatewayBaseUrl ?? DEFAULT_IPFS_GATEWAY_BASE_URL,
    );
    return `${gatewayBaseUrl}/ipfs/${path}`;
  }

  if (trimmed.startsWith("//")) {
    return normalizeHttpUrl(`https:${trimmed}`);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return normalizeHttpUrl(trimmed);
  }

  if (looksLikeHostnameWithoutScheme(trimmed)) {
    return normalizeHttpUrl(`https://${trimmed}`);
  }

  if (looksLikeCid(trimmed)) {
    const gatewayBaseUrl = ensureGatewayBaseUrl(
      options.defaultGatewayBaseUrl ?? DEFAULT_IPFS_GATEWAY_BASE_URL,
    );
    return `${gatewayBaseUrl}/ipfs/${trimmed}`;
  }

  return trimmed;
};
