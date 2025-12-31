import { HttpError } from "@/server/http-error";
import { readApiResponse } from "@/lib/api-response";

const PINATA_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
const PINATA_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

const MAX_FILE_BYTES = 15_000_000;

const getPinataJwt = () => process.env.PINATA_JWT?.trim() ?? "";

export const hasIpfsConfigured = () => Boolean(getPinataJwt());

const requireIpfsConfigured = () => {
  if (!hasIpfsConfigured()) {
    throw new HttpError(501, "IPFS pinning is currently unavailable.");
  }
};

const isAllowedRemoteHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  return (
    host === "ufs.sh" ||
    host.endsWith(".ufs.sh") ||
    host === "utfs.io" ||
    host === "images.unsplash.com" ||
    host === "lh3.googleusercontent.com"
  );
};

const assertSafeRemoteUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, "Invalid image URL");
  }

  if (url.protocol !== "https:") {
    throw new HttpError(400, "Image URL must use https");
  }

  if (!isAllowedRemoteHost(url.hostname)) {
    throw new HttpError(400, "Unsupported image host");
  }

  return url;
};

const pinataFetch = async <T>(params: { url: string; init: RequestInit; fallback: string }) => {
  requireIpfsConfigured();
  const jwt = getPinataJwt();
  const headers = new Headers(params.init.headers);
  headers.set("Authorization", `Bearer ${jwt}`);

  const res = await fetch(params.url, {
    ...params.init,
    headers,
  });

  return readApiResponse<T>(res, params.fallback);
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
  const remote = assertSafeRemoteUrl(params.url);

  const res = await fetch(remote.toString());
  if (!res.ok) {
    throw new HttpError(502, "Failed to fetch image");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new HttpError(413, "Image too large");
  }

  const fileType = params.mimeType ?? res.headers.get("content-type") ?? "application/octet-stream";
  const blob = new Blob([buffer], { type: fileType });
  const file = new File([blob], params.name, { type: fileType });

  const form = new FormData();
  form.append("file", file);
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

