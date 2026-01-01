import { HttpError } from "@/server/http-error";
import { readApiResponse } from "@/lib/api-response";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

const PINATA_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

const MAX_FILE_BYTES = 15_000_000;

const normalizeSecret = (raw: string | undefined) => {
  const value = raw?.trim() ?? "";
  if (!value) return "";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }

  return value;
};

const getPinataJwt = () => {
  const raw = normalizeSecret(process.env.PINATA_JWT);
  if (!raw) return "";
  return raw.replace(/^bearer\s+/i, "").trim();
};

const getPinataApiKey = () => normalizeSecret(process.env.PINATA_API_KEY);

const getPinataSecretApiKey = () =>
  normalizeSecret(process.env.PINATA_SECRET_API_KEY ?? process.env.PINATA_API_SECRET);

type PinataAuth =
  | { type: "jwt"; jwt: string }
  | { type: "keys"; apiKey: string; secretApiKey: string };

const getPinataAuthOptions = (): PinataAuth[] => {
  const jwt = getPinataJwt();
  const apiKey = getPinataApiKey();
  const secretApiKey = getPinataSecretApiKey();

  const options: PinataAuth[] = [];
  if (jwt) {
    options.push({ type: "jwt", jwt });
  }
  if (apiKey && secretApiKey) {
    options.push({ type: "keys", apiKey, secretApiKey });
  }

  return options;
};

export const hasIpfsConfigured = () => getPinataAuthOptions().length > 0;

const requireIpfsConfigured = () => {
  if (!hasIpfsConfigured()) {
    throw new HttpError(501, "IPFS pinning is currently unavailable.");
  }
};

const applyPinataAuthHeaders = (headers: Headers, auth: PinataAuth) => {
  if (auth.type === "jwt") {
    headers.set("Authorization", `Bearer ${auth.jwt}`);
    return;
  }

  headers.set("pinata_api_key", auth.apiKey);
  headers.set("pinata_secret_api_key", auth.secretApiKey);
};

const pinataFetch = async <T>(params: { url: string; init: RequestInit; fallback: string }) => {
  requireIpfsConfigured();
  const authOptions = getPinataAuthOptions();

  for (let index = 0; index < authOptions.length; index++) {
    const auth = authOptions[index];
    const headers = new Headers(params.init.headers);
    applyPinataAuthHeaders(headers, auth);

    const res = await fetch(params.url, {
      ...params.init,
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => "");
      console.error(`Pinata auth failed (${auth.type}):`, res.status, body);
      if (index < authOptions.length - 1) {
        continue;
      }
      throw new HttpError(
        501,
        "IPFS pinning is misconfigured. Verify PINATA_JWT (or PINATA_API_KEY + PINATA_SECRET_API_KEY).",
      );
    }

    return readApiResponse<T>(res, params.fallback);
  }

  throw new HttpError(
    501,
    "IPFS pinning is currently unavailable. Set PINATA_JWT or PINATA_API_KEY + PINATA_SECRET_API_KEY.",
  );
};

export const pinJsonToIpfs = async (params: {
  json: unknown;
  name?: string;
}): Promise<{ cid: string }> => {
  const body = params.name
    ? { pinataMetadata: { name: params.name }, pinataContent: params.json }
    : { pinataContent: params.json };

  const response = await pinataFetch<{ IpfsHash: string }>({
    url: PINATA_JSON_ENDPOINT,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    fallback: "Failed to pin JSON to IPFS",
  });

  if (!response.IpfsHash) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid: response.IpfsHash };
};

export const pinFileFromUrlToIpfs = async (params: {
  url: string;
  name: string;
  mimeType?: string;
}): Promise<{ cid: string }> => {
  const remote = assertSafeRemoteUrl(params.url, "Invalid image URL");

  const res = await fetch(remote.toString());
  assertSafeRemoteUrl(res.url, "Invalid image URL");
  if (!res.ok) {
    throw new HttpError(502, "Failed to fetch image");
  }

  const contentLengthRaw = res.headers.get("content-length");
  if (contentLengthRaw) {
    const contentLength = Number(contentLengthRaw);
    if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) {
      throw new HttpError(413, "Image too large");
    }
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new HttpError(413, "Image too large");
  }

  const fileType = params.mimeType ?? res.headers.get("content-type") ?? "application/octet-stream";
  const blob = new Blob([buffer], { type: fileType });

  const form = new FormData();
  form.append("file", blob, params.name);
  form.append("pinataMetadata", JSON.stringify({ name: params.name }));

  const response = await pinataFetch<{ IpfsHash: string }>({
    url: PINATA_FILE_ENDPOINT,
    init: {
      method: "POST",
      body: form,
    },
    fallback: "Failed to pin file to IPFS",
  });

  if (!response.IpfsHash) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid: response.IpfsHash };
};
