import { describe, expect, test } from "bun:test";

import { buildPrintrTokenUrl } from "@/features/printr/constants";

describe("buildPrintrTokenUrl", () => {
  test("returns app.printr.money url by default", () => {
    const previous = process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE;
    delete process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE;

    try {
      expect(buildPrintrTokenUrl("123")).toBe("https://app.printr.money/token/123");
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE;
      } else {
        process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE = previous;
      }
    }
  });

  test("supports template placeholder", () => {
    const previous = process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE;
    process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE = "https://example.com/tokens/{tokenId}";

    try {
      expect(buildPrintrTokenUrl("abc")).toBe("https://example.com/tokens/abc");
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE;
      } else {
        process.env.NEXT_PUBLIC_PRINTR_TOKEN_URL_TEMPLATE = previous;
      }
    }
  });
});

