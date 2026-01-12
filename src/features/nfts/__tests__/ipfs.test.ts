import { describe, expect, test } from "bun:test";

import { getIpfsGatewayBase, ipfsToHttpUrl, ipfsToPublicHttpUrl } from "@/features/nfts/ipfs";

describe("ipfsToHttpUrl", () => {
  test("converts ipfs:// URIs using default gateway", () => {
    expect(ipfsToHttpUrl("ipfs://bafy123")).toBe(
      "https://gateway.pinata.cloud/ipfs/bafy123",
    );
  });

  test("converts ipfs://ipfs/ URIs using default gateway", () => {
    expect(ipfsToHttpUrl("ipfs://ipfs/bafy123")).toBe(
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

  test("normalizes scheme-less Pinata gateway URLs", () => {
    const cid = "bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi";

    expect(ipfsToHttpUrl(`plum-high-rook-436.mypinata.cloud/${cid}`)).toBe(
      `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`,
    );

    expect(ipfsToHttpUrl(`https://plum-high-rook-436.mypinata.cloud/${cid}`)).toBe(
      `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`,
    );

    expect(ipfsToHttpUrl(`https://pigcasso-canva.vercel.app/plum-high-rook-436.mypinata.cloud/${cid}`)).toBe(
      `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`,
    );
  });

  test("converts bare CIDs using configured gateway", () => {
    expect(ipfsToHttpUrl("bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi")).toBe(
      "https://gateway.pinata.cloud/ipfs/bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi",
    );
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

  test("normalizes gateway hostnames without scheme", () => {
    const previous = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
    process.env.NEXT_PUBLIC_IPFS_GATEWAY = "plum-high-rook-436.mypinata.cloud";

    try {
      expect(getIpfsGatewayBase()).toBe("https://plum-high-rook-436.mypinata.cloud/ipfs/");
      expect(ipfsToHttpUrl("ipfs://bafy123")).toBe("https://plum-high-rook-436.mypinata.cloud/ipfs/bafy123");
    } finally {
      process.env.NEXT_PUBLIC_IPFS_GATEWAY = previous;
    }
  });
});

describe("ipfsToPublicHttpUrl", () => {
  test("converts ipfs:// URIs using ipfs.io", () => {
    expect(ipfsToPublicHttpUrl("ipfs://bafy123")).toBe("https://ipfs.io/ipfs/bafy123");
  });

  test("converts ipfs://ipfs/ URIs using ipfs.io", () => {
    expect(ipfsToPublicHttpUrl("ipfs://ipfs/bafy123")).toBe("https://ipfs.io/ipfs/bafy123");
  });

  test("converts bare CIDs using ipfs.io", () => {
    expect(ipfsToPublicHttpUrl("bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi")).toBe(
      "https://ipfs.io/ipfs/bafybeib7ti6s5ei73wer5fnfxrstznf3aau537bpksqw55knp7s5gznrxi",
    );
  });

  test("passes through http(s) URLs", () => {
    expect(ipfsToPublicHttpUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(ipfsToPublicHttpUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
  });
});
