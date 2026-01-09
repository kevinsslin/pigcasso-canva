import { HttpError } from "@/server/http-error";
import { readApiResponse } from "@/lib/api-response";
import { getApiErrorStatus } from "@/lib/api-error";
import type { JSONValue } from "hono/utils/types";

const DEFAULT_PRINTR_API_URL = "https://api-preview.printr.money/v0";

export const getPrintrApiUrl = () => {
  const value = process.env.PRINTR_API_URL?.trim();
  return value && value.length > 0 ? value : DEFAULT_PRINTR_API_URL;
};

const normalizeBearerToken = (value: string) => {
  const trimmed = value.trim();
  const withoutQuotes = trimmed.replace(/^"|"$/g, "");
  return withoutQuotes.replace(/^Bearer\s+/i, "").trim();
};

export const getPrintrApiToken = () => {
  const raw = process.env.PRINTR_API_TOKEN?.trim() ?? "";
  if (!raw) return "";
  return normalizeBearerToken(raw);
};

export const hasPrintrConfigured = () => Boolean(getPrintrApiToken());

const joinUrl = (baseUrl: string, path: string) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
};

export const printrFetchJson = async <T extends JSONValue = JSONValue>(params: {
  path: string;
  init?: RequestInit;
  fallbackMessage?: string;
}): Promise<T> => {
  if (!hasPrintrConfigured()) {
    throw new HttpError(501, "Printr integration is currently unavailable.", { expose: true });
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

  try {
    return await readApiResponse<T>(
      res,
      params.fallbackMessage ?? "Printr request failed",
    );
  } catch (error) {
    const status = getApiErrorStatus(error);
    if (!status) {
      throw error;
    }

    const message = error instanceof Error && error.message ? error.message : "Printr request failed";
    throw new HttpError(status >= 500 ? 502 : status, message);
  }
};

export const toCaip10Account = (params: {
  chain: string;
  address: string;
}) => `${params.chain}:${params.address}`;

type PrintrPublishPayload = {
  name: string;
  imageUrl: string;
  sourceRepoUrl?: string | null;
};

export const publishToPrintr = async (payload: PrintrPublishPayload) => {
  const endpoint = process.env.PRINTR_PUBLISH_URL?.trim();
  if (!endpoint) {
    throw new Error("PRINTR_PUBLISH_URL is not configured");
  }

  const apiKey = process.env.PRINTR_API_KEY?.trim();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Printr publish failed: ${res.status}`);
  }

  const json = await res.json().catch(() => null);

  return {
    message: (json as { message?: unknown } | null)?.message ?? "Published to Printr.",
    response: json,
  };
};
