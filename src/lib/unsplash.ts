import { createApi } from "unsplash-js";

const getAccessKey = () => {
  const key =
    process.env.UNSPLASH_ACCESS_KEY?.trim() ||
    process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY?.trim();
  return key || null;
};

export const hasUnsplashConfigured = () => Boolean(getAccessKey());

let cachedClient: ReturnType<typeof createApi> | null = null;

export const getUnsplashClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const accessKey = getAccessKey();
  if (!accessKey) {
    throw new Error("Unsplash is currently unavailable.");
  }

  cachedClient = createApi({
    accessKey,
    fetch,
  });

  return cachedClient;
};

