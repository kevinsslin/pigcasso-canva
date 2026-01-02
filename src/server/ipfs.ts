import { HttpError } from "@/server/http-error";
import { readApiResponse, readResponseBody } from "@/lib/api-response";
import { extractBodyErrorMessage } from "@/lib/api-error";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

const PINATA_UPLOAD_ENDPOINT = "https://uploads.pinata.cloud/v3/files";
const PINATA_NETWORK = "public";

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
  headers.set("pinata_api_secret", auth.secretApiKey);
};

const formatPinataFailure = (params: {
  type: PinataAuth["type"];
  status: number;
  message: string | null;
}) => {
  const suffix = params.message ? `: ${params.message}` : "";
  return `${params.type} (${params.status})${suffix}`;
};

const pinataFetch = async <T>(params: { url: string; init: RequestInit; fallback: string }) => {
  requireIpfsConfigured();
  const authOptions = getPinataAuthOptions();
  const failures: Array<{ type: PinataAuth["type"]; status: number; message: string | null }> = [];

  for (let index = 0; index < authOptions.length; index++) {
    const auth = authOptions[index];
    const headers = new Headers(params.init.headers);
    applyPinataAuthHeaders(headers, auth);

    const res = await fetch(params.url, {
      ...params.init,
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      const body = await readResponseBody(res);
      const message =
        extractBodyErrorMessage(body) ??
        (typeof body === "string" && body.trim().length > 0 ? body.trim() : null);

      failures.push({ type: auth.type, status: res.status, message });
      console.error(`Pinata auth failed (${auth.type}):`, res.status, message ?? body);
      if (index < authOptions.length - 1) {
        continue;
      }

      const detail = failures.length ? failures.map(formatPinataFailure).join("; ") : "unknown";
      throw new HttpError(
        501,
        `IPFS pinning is misconfigured. Pinata auth failed: ${detail}. Verify PINATA_JWT (or PINATA_API_KEY + PINATA_SECRET_API_KEY).`,
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
  requireIpfsConfigured();
  const jsonString = JSON.stringify(params.json);
  const fileName = params.name?.trim() || "pigcasso.json";
  const blob = new Blob([jsonString], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });

  const form = new FormData();
  form.append("file", file);
  form.append("network", PINATA_NETWORK);

  const response = await pinataFetch<{ data?: { cid?: string } }>({
    url: PINATA_UPLOAD_ENDPOINT,
    init: {
      method: "POST",
      body: form,
    },
    fallback: "Failed to upload JSON to IPFS",
  });

  const cid = response.data?.cid;
  if (!cid) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid };
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
  form.append("network", PINATA_NETWORK);

  const response = await pinataFetch<{ data?: { cid?: string } }>({
    url: PINATA_UPLOAD_ENDPOINT,
    init: {
      method: "POST",
      body: form,
    },
    fallback: "Failed to upload file to IPFS",
  });

  const cid = response.data?.cid;
  if (!cid) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid };
};
