import { HttpError } from "@/server/http-error";

const normalizeEnvValue = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export const getNodeEnv = () => normalizeEnvValue(process.env.NODE_ENV) || "development";

export const isProd = () => getNodeEnv() === "production";

export const getEnv = (key: string) => normalizeEnvValue(process.env[key]);

export const requireEnv = (
  key: string,
  options?: {
    status?: number;
    expose?: boolean;
    message?: string;
    code?: string;
  },
) => {
  const value = getEnv(key);
  if (value) {
    return value;
  }

  throw new HttpError(
    options?.status ?? 500,
    options?.message ?? `Server misconfigured: Missing ${key}`,
    {
      code: options?.code ?? `MISSING_${key}`,
      expose: options?.expose ?? true,
    },
  );
};

