type AuthTokenGetter = () => Promise<string | null>;

let authTokenGetter: AuthTokenGetter | null = null;
let authTokenGetterReadyResolve: (() => void) | null = null;
const authTokenGetterReady = new Promise<void>((resolve) => {
  authTokenGetterReadyResolve = resolve;
});

export const setAuthTokenGetter = (getter: AuthTokenGetter) => {
  authTokenGetter = getter;
  authTokenGetterReadyResolve?.();
  authTokenGetterReadyResolve = null;
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const getAuthToken = async (options?: {
  maxWaitMs?: number;
  retries?: number;
  retryDelayMs?: number;
}) => {
  const maxWaitMs = options?.maxWaitMs ?? 500;
  const retries = options?.retries ?? 2;
  const retryDelayMs = options?.retryDelayMs ?? 150;

  if (!authTokenGetter) {
    await Promise.race([authTokenGetterReady, delay(maxWaitMs)]);
  }

  if (!authTokenGetter) {
    return null;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const token = await authTokenGetter();
      if (token) {
        return token;
      }
    } catch {
      // ignore
    }

    if (attempt < retries) {
      await delay(retryDelayMs);
    }
  }

  return null;
};
