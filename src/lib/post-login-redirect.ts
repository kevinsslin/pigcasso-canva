export const POST_LOGIN_REDIRECT_STORAGE_KEY = "pigcasso:post_login_redirect";

type StoredRedirect = {
  path: string;
  createdAt: number;
};

const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

export const toSafeRedirectPath = (value: string | null | undefined, fallback = "/app") => {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
};

export const serializePostLoginRedirect = (path: string, nowMs = Date.now()) => {
  const record: StoredRedirect = {
    path,
    createdAt: nowMs,
  };
  return JSON.stringify(record);
};

export const parsePostLoginRedirect = (raw: string | null | undefined) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRedirect>;
    if (typeof parsed?.path !== "string") return null;
    if (typeof parsed?.createdAt !== "number") return null;
    return { path: parsed.path, createdAt: parsed.createdAt } satisfies StoredRedirect;
  } catch {
    return null;
  }
};

export const shouldUsePostLoginRedirect = (
  record: StoredRedirect,
  nowMs = Date.now(),
  maxAgeMs = DEFAULT_MAX_AGE_MS,
) => {
  if (!record.path.trim()) return false;
  if (!Number.isFinite(record.createdAt)) return false;
  if (record.createdAt > nowMs + 5_000) return false;
  return nowMs - record.createdAt <= maxAgeMs;
};

export const setPostLoginRedirect = (path: string) => {
  if (typeof window === "undefined") return;
  if (!window.localStorage) return;

  try {
    window.localStorage.setItem(
      POST_LOGIN_REDIRECT_STORAGE_KEY,
      serializePostLoginRedirect(path),
    );
  } catch {
    // ignore (storage may be unavailable)
  }
};

export const getPostLoginRedirect = () => {
  if (typeof window === "undefined") return null;
  if (!window.localStorage) return null;

  try {
    const parsed = parsePostLoginRedirect(
      window.localStorage.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY),
    );
    if (!parsed) return null;
    if (!shouldUsePostLoginRedirect(parsed)) return null;
    return parsed.path;
  } catch {
    return null;
  }
};

export const clearPostLoginRedirect = () => {
  if (typeof window === "undefined") return;
  if (!window.localStorage) return;

  try {
    window.localStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY);
  } catch {
    // ignore
  }
};

