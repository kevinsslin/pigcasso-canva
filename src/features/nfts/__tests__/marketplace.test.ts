import { describe, expect, test } from "bun:test";

import { buildNftMarketplaceUrl, getNftMarketplaceLabel } from "@/features/nfts/marketplace";

describe("marketplace helpers", () => {
  test("returns null when template missing", () => {
    const previous = process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE;
    delete process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE;

    try {
      expect(buildNftMarketplaceUrl({ collectionAddress: "0xabc", tokenId: "1" })).toBeNull();
    } finally {
      process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE = previous;
    }
  });

  test("builds url from template placeholders", () => {
    const previous = process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE;
    process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE =
      "https://market.example.com/assets/{collectionAddress}/{tokenId}";

    try {
      expect(
        buildNftMarketplaceUrl({
          collectionAddress: "0x1234567890abcdef1234567890abcdef12345678",
          tokenId: "42",
        }),
      ).toBe(
        "https://market.example.com/assets/0x1234567890abcdef1234567890abcdef12345678/42",
      );
    } finally {
      process.env.NEXT_PUBLIC_NFT_MARKETPLACE_URL_TEMPLATE = previous;
    }
  });

  test("label defaults and respects env", () => {
    const previous = process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LABEL;
    delete process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LABEL;

    try {
      expect(getNftMarketplaceLabel()).toBe("Marketplace");
      process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LABEL = "NFT Market";
      expect(getNftMarketplaceLabel()).toBe("NFT Market");
    } finally {
      process.env.NEXT_PUBLIC_NFT_MARKETPLACE_LABEL = previous;
    }
  });
});

