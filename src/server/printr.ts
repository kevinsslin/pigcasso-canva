import { HttpError } from "@/server/http-error";
import { readApiResponse } from "@/lib/api-response";

const DEFAULT_PRINTR_API_URL = "https://api-preview.printr.money/v0";

export const getPrintrApiUrl = () => {
  const value = process.env.PRINTR_API_URL?.trim();
  return value && value.length > 0 ? value : DEFAULT_PRINTR_API_URL;
};

export const getPrintrApiToken = () => process.env.PRINTR_API_TOKEN?.trim() ?? "";

export const hasPrintrConfigured = () => Boolean(getPrintrApiToken());

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
};

export const printrFetchJson = async <T>(params: {
  path: string;
  init?: RequestInit;
  fallbackMessage?: string;
}): Promise<T> => {
  if (!hasPrintrConfigured()) {
    throw new HttpError(501, "Printr integration is currently unavailable.");
  }

  const url = joinUrl(getPrintrApiUrl(), params.path);
  const token = getPrintrApiToken();
  const headers = new Headers(params.init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const res = await fetch(url, {
    ...params.init,
    headers,
  });

  return await readApiResponse<T>(
    res,
    params.fallbackMessage ?? "Printr request failed",
  );
};

export const toCaip10Account = (params: {
  chain: string;
  address: string;
}) => `${params.chain}:${params.address}`;

