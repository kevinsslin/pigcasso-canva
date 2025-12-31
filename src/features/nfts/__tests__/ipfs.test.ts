import { describe, expect, test } from "bun:test";

import { getIpfsGatewayBase, ipfsToHttpUrl } from "@/features/nfts/ipfs";

describe("ipfsToHttpUrl", () => {
  test("converts ipfs:// URIs using default gateway", () => {
    expect(ipfsToHttpUrl("ipfs://bafy123")).toBe(
      "https://gateway.pinata.cloud/ipfs/bafy123",
    );
  });

  test("passes through http(s) URLs", () => {
    expect(ipfsToHttpUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(ipfsToHttpUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
  });

  test("returns null for unsupported schemes", () => {
    expect(ipfsToHttpUrl("ar://abc")).toBeNull();
    expect(ipfsToHttpUrl("")).toBeNull();
    expect(ipfsToHttpUrl("   ")).toBeNull();
    expect(ipfsToHttpUrl(null)).toBeNull();
  });
});

describe("getIpfsGatewayBase", () => {
  test("uses NEXT_PUBLIC_IPFS_GATEWAY when set", () => {
    const previous = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
    process.env.NEXT_PUBLIC_IPFS_GATEWAY = "https://example.com/ipfs";

    try {
      expect(getIpfsGatewayBase()).toBe("https://example.com/ipfs/");
      expect(ipfsToHttpUrl("ipfs://bafy456")).toBe("https://example.com/ipfs/bafy456");
    } finally {
      process.env.NEXT_PUBLIC_IPFS_GATEWAY = previous;
    }
  });
});

