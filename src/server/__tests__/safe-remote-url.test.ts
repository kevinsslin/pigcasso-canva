import { describe, expect, test } from "bun:test";

import { assertSafeRemoteUrl, isAllowedRemoteHost } from "@/server/safe-remote-url";

describe("isAllowedRemoteHost", () => {
  test("allows uploadthing hosts", () => {
    expect(isAllowedRemoteHost("ufs.sh")).toBe(true);
    expect(isAllowedRemoteHost("q4mak8f8a0.ufs.sh")).toBe(true);
  });

  test("allows known integrations", () => {
    expect(isAllowedRemoteHost("images.unsplash.com")).toBe(true);
    expect(isAllowedRemoteHost("utfs.io")).toBe(true);
    expect(isAllowedRemoteHost("gateway.pinata.cloud")).toBe(true);
    expect(isAllowedRemoteHost("plum-high-rook-436.mypinata.cloud")).toBe(true);
    expect(isAllowedRemoteHost("cloudflare-ipfs.com")).toBe(true);
    expect(isAllowedRemoteHost("arweave.net")).toBe(true);
  });

  test("rejects unknown hosts", () => {
    expect(isAllowedRemoteHost("example.com")).toBe(false);
  });
});

describe("assertSafeRemoteUrl", () => {
  test("requires https", () => {
    expect(() => assertSafeRemoteUrl("http://ufs.sh/f/abc")).toThrow(
      "URL must use https",
    );
  });

  test("rejects unsupported hosts", () => {
    expect(() => assertSafeRemoteUrl("https://example.com/a.png")).toThrow(
      "Unsupported URL host",
    );
  });

  test("accepts allowed urls", () => {
    const url = assertSafeRemoteUrl("https://q4mak8f8a0.ufs.sh/f/abc");
    expect(url.hostname).toBe("q4mak8f8a0.ufs.sh");
  });

  test("supports custom NEXT_PUBLIC_IPFS_GATEWAY host", () => {
    const previous = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
    process.env.NEXT_PUBLIC_IPFS_GATEWAY = "https://example-gateway.dev/ipfs/";

    try {
      const url = assertSafeRemoteUrl("https://example-gateway.dev/ipfs/bafy123");
      expect(url.hostname).toBe("example-gateway.dev");
    } finally {
      process.env.NEXT_PUBLIC_IPFS_GATEWAY = previous;
    }
  });
});
