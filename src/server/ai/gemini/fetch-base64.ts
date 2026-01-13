import { HttpError } from "@/server/http-error";
import { assertSafeRemoteUrl } from "@/server/safe-remote-url";

const MAX_REMOTE_IMAGE_BYTES = 15_000_000;

export const fetchUrlAsBase64 = async (input: string) => {
  const remote = assertSafeRemoteUrl(input, "Invalid image URL");

  const res = await fetch(remote.toString());
  assertSafeRemoteUrl(res.url, "Invalid image URL");
  if (!res.ok) {
    throw new HttpError(502, `Failed to fetch image: ${res.status}`, { expose: true });
  }

  const contentLengthRaw = res.headers.get("content-length");
  if (contentLengthRaw) {
    const contentLength = Number(contentLengthRaw);
    if (Number.isFinite(contentLength) && contentLength > MAX_REMOTE_IMAGE_BYTES) {
      throw new HttpError(413, "Image too large");
    }
  }

  const mimeType = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new HttpError(413, "Image too large");
  }

  return {
    mimeType,
    base64: buf.toString("base64"),
  };
};

