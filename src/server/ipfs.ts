import { HttpError } from "@/server/http-error";
import { readApiResponse } from "@/lib/api-response";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

const PINATA_V3_UPLOAD_ENDPOINT = "https://uploads.pinata.cloud/v3/files";
const PINATA_LEGACY_PIN_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_LEGACY_PIN_JSON_ENDPOINT = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
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

type PinataJwtAuth = { type: "jwt"; jwt: string };
type PinataKeysAuth = { type: "keys"; apiKey: string; secretApiKey: string };
type PinataAuth = PinataJwtAuth | PinataKeysAuth;

const getPinataJwtAuth = (): PinataJwtAuth | null => {
  const jwt = getPinataJwt();
  if (!jwt) return null;
  return { type: "jwt", jwt };
};

const getPinataKeysAuth = (): PinataKeysAuth | null => {
  const apiKey = getPinataApiKey();
  const secretApiKey = getPinataSecretApiKey();
  if (!apiKey || !secretApiKey) return null;
  return { type: "keys", apiKey, secretApiKey };
};

export const hasIpfsConfigured = () => Boolean(getPinataJwtAuth() || getPinataKeysAuth());

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
  label: string;
  status: number;
  message: string | null;
}) => {
  const suffix = params.message ? `: ${params.message}` : "";
  return `${params.label} (${params.status})${suffix}`;
};

type PinataFailure = {
  label: string;
  status: number;
  message: string | null;
};

const createPinataMisconfiguredError = (failures: PinataFailure[]) => {
  const detail = failures.length ? failures.map(formatPinataFailure).join("; ") : "unknown";
  return new HttpError(
    501,
    `IPFS pinning is misconfigured. Pinata auth failed: ${detail}. ` +
      "If you see 403, your Pinata key is missing required permissions. " +
      "For V3 uploads (`jwt-v3`), ensure the key includes `org:files:write` (or use an Admin key). " +
      "For legacy endpoints (`keys-legacy`), ensure `pinFileToIPFS` and `pinJSONToIPFS` are allowed. " +
      "After updating env vars, redeploy Vercel so the runtime picks them up.",
  );
};

const pinataUploadV3 = async (params: { file: Blob | File; name?: string }): Promise<{ cid: string }> => {
  const jwtAuth = getPinataJwtAuth();
  if (!jwtAuth) {
    throw new HttpError(
      501,
      "IPFS pinning is currently unavailable. Set `PINATA_JWT` for Pinata V3 uploads.",
    );
  }

  const form = new FormData();
  form.append("file", params.file, params.name);
  form.append("network", PINATA_NETWORK);

  const res = await fetch(PINATA_V3_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwtAuth.jwt}`,
    },
    body: form,
  });

  const body = await readApiResponse<{ data?: { cid?: string } }>(res, "Failed to upload file to IPFS");
  const cid = body.data?.cid;
  if (!cid) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid };
};

const pinataPinJsonLegacy = async (params: { json: unknown; name?: string }): Promise<{ cid: string }> => {
  const keysAuth = getPinataKeysAuth();
  if (!keysAuth) {
    throw new HttpError(
      501,
      "IPFS pinning is currently unavailable. Set `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` for legacy Pinata endpoints.",
    );
  }

  const payload = {
    pinataOptions: { cidVersion: 1 },
    pinataMetadata: params.name ? { name: params.name } : undefined,
    pinataContent: params.json,
  };

  const headers = new Headers({ "Content-Type": "application/json" });
  applyPinataAuthHeaders(headers, keysAuth);

  const res = await fetch(PINATA_LEGACY_PIN_JSON_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await readApiResponse<{ IpfsHash?: string }>(res, "Failed to upload JSON to IPFS");
  const cid = body.IpfsHash;
  if (!cid) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid };
};

const pinataPinFileLegacy = async (params: { file: Blob | File; name: string }): Promise<{ cid: string }> => {
  const keysAuth = getPinataKeysAuth();
  if (!keysAuth) {
    throw new HttpError(
      501,
      "IPFS pinning is currently unavailable. Set `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` for legacy Pinata endpoints.",
    );
  }

  const form = new FormData();
  form.append("file", params.file, params.name);

  const metadata = { name: params.name };
  form.append("pinataMetadata", JSON.stringify(metadata));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const headers = new Headers();
  applyPinataAuthHeaders(headers, keysAuth);

  const res = await fetch(PINATA_LEGACY_PIN_FILE_ENDPOINT, {
    method: "POST",
    headers,
    body: form,
  });

  const body = await readApiResponse<{ IpfsHash?: string }>(res, "Failed to upload file to IPFS");
  const cid = body.IpfsHash;
  if (!cid) {
    throw new HttpError(502, "Invalid IPFS response");
  }

  return { cid };
};

export const pinJsonToIpfs = async (params: {
  json: unknown;
  name?: string;
}): Promise<{ cid: string }> => {
  requireIpfsConfigured();
  const failures: PinataFailure[] = [];

  const fileName = params.name?.trim() || "pigcasso.json";
  const jsonString = JSON.stringify(params.json);
  const blob = new Blob([jsonString], { type: "application/json" });
  const file = new File([blob], fileName, { type: "application/json" });

  const jwtAuth = getPinataJwtAuth();
  if (jwtAuth) {
    try {
      return await pinataUploadV3({ file, name: fileName });
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number" && (status === 401 || status === 403)) {
        failures.push({ label: "jwt-v3", status, message: (error as { message?: string }).message ?? null });
      } else {
        throw error;
      }
    }
  }

  const keysAuth = getPinataKeysAuth();
  if (keysAuth) {
    try {
      return await pinataPinJsonLegacy({ json: params.json, name: fileName });
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number" && (status === 401 || status === 403)) {
        failures.push({ label: "keys-legacy", status, message: (error as { message?: string }).message ?? null });
        throw createPinataMisconfiguredError(failures);
      }
      throw error;
    }
  }

  throw createPinataMisconfiguredError(failures);
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

  const failures: PinataFailure[] = [];

  const jwtAuth = getPinataJwtAuth();
  if (jwtAuth) {
    try {
      return await pinataUploadV3({ file: blob, name: params.name });
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number" && (status === 401 || status === 403)) {
        failures.push({ label: "jwt-v3", status, message: (error as { message?: string }).message ?? null });
      } else {
        throw error;
      }
    }
  }

  const keysAuth = getPinataKeysAuth();
  if (keysAuth) {
    try {
      return await pinataPinFileLegacy({ file: blob, name: params.name });
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === "number" && (status === 401 || status === 403)) {
        failures.push({ label: "keys-legacy", status, message: (error as { message?: string }).message ?? null });
        throw createPinataMisconfiguredError(failures);
      }
      throw error;
    }
  }

  throw createPinataMisconfiguredError(failures);
};
