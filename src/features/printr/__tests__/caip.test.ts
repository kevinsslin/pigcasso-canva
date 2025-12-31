import { describe, expect, test } from "bun:test";

import { getEip155ChainId, parseCaip10, parseCaip2 } from "@/features/printr/lib/caip";

describe("CAIP helpers", () => {
  test("parses CAIP-2", () => {
    expect(parseCaip2("eip155:5000")).toEqual({
      namespace: "eip155",
      reference: "5000",
      value: "eip155:5000",
    });
  });

  test("gets EIP-155 chain id", () => {
    expect(getEip155ChainId("eip155:5000")).toBe(5000);
    expect(getEip155ChainId("solana:mainnet")).toBeNull();
  });

  test("parses CAIP-10", () => {
    expect(parseCaip10("eip155:5000:0xabc")).toEqual({
      chain: "eip155:5000",
      address: "0xabc",
    });
  });
});

