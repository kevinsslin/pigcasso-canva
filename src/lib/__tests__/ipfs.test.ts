/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { normalizeIpfsUrl } from "@/lib/ipfs";

describe("normalizeIpfsUrl", () => {
  const cid =
    "bafybeiawwqgowmbub3o6uqsh65smnalcw7rhozrk7gpqtgdm5rvpwueiiu";

  test("fixes missing scheme and /ipfs for Pinata gateway hosts", () => {
    const input = `plum-high-rook-436.mypinata.cloud/${cid}`;
    expect(normalizeIpfsUrl(input)).toBe(
      `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`,
    );
  });

  test("fixes missing /ipfs for Pinata gateway hosts even when scheme is present", () => {
    const input = `https://plum-high-rook-436.mypinata.cloud/${cid}`;
    expect(normalizeIpfsUrl(input)).toBe(
      `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`,
    );
  });

  test("fixes app-prefixed Pinata gateway URLs that were treated as relative", () => {
    const input = `https://pigcasso-canva.vercel.app/plum-high-rook-436.mypinata.cloud/${cid}`;
    expect(normalizeIpfsUrl(input)).toBe(
      `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`,
    );
  });

  test("leaves already-correct Pinata gateway URLs as-is", () => {
    const input = `https://plum-high-rook-436.mypinata.cloud/ipfs/${cid}`;
    expect(normalizeIpfsUrl(input)).toBe(input);
  });

  test("converts ipfs:// URLs to a default gateway", () => {
    expect(normalizeIpfsUrl(`ipfs://${cid}`)).toBe(`https://ipfs.io/ipfs/${cid}`);
    expect(normalizeIpfsUrl(`ipfs://ipfs/${cid}`)).toBe(
      `https://ipfs.io/ipfs/${cid}`,
    );
  });

  test("converts bare CIDs to a default gateway", () => {
    expect(normalizeIpfsUrl(cid)).toBe(`https://ipfs.io/ipfs/${cid}`);
  });

  test("converts bafk... CIDv1 base32 to a default gateway", () => {
    const metadataCid =
      "bafkreiesc5x46rhgxl5locju6l5nvzfburg5f3xg2d37rcpeh7amksiuca";
    expect(normalizeIpfsUrl(metadataCid)).toBe(
      `https://ipfs.io/ipfs/${metadataCid}`,
    );
  });
});
