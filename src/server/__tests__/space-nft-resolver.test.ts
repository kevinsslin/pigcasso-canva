import { describe, expect, test } from "bun:test";

import { applyErc1155UriTemplate } from "@/server/space-nft-resolver";

describe("applyErc1155UriTemplate", () => {
  test("replaces {id} with 64-char lowercase hex", () => {
    expect(applyErc1155UriTemplate("ipfs://{id}", 1n)).toBe(
      `ipfs://${"1".padStart(64, "0")}`,
    );
  });

  test("replaces mixed-case id placeholders", () => {
    expect(applyErc1155UriTemplate("https://example.com/{ID}.json", 255n)).toBe(
      `https://example.com/${"ff".padStart(64, "0")}.json`,
    );
  });

  test("returns template unchanged when no placeholder exists", () => {
    expect(applyErc1155UriTemplate("ipfs://bafy123", 123n)).toBe("ipfs://bafy123");
  });
});

