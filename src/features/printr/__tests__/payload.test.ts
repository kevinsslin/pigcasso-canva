import { describe, expect, test } from "bun:test";

import { base64ToHex } from "@/features/printr/lib/base64";
import {
  buildEvmTransactionFromPrintrPayload,
  isPrintrEvmPayload,
  type PrintrEvmPayload,
} from "@/features/printr/lib/payload";

describe("Printr payload helpers", () => {
  test("converts base64 to hex", () => {
    expect(base64ToHex("AQID")).toBe("0x010203");
  });

  test("detects EVM payload shapes", () => {
    expect(
      isPrintrEvmPayload({
        to: "eip155:5000:0x0",
        calldata: "AA==",
        value: "0",
        gas_limit: 1,
      }),
    ).toBe(true);

    expect(isPrintrEvmPayload({})).toBe(false);
  });

  test("builds a viem tx from EVM payload", () => {
    const payload: PrintrEvmPayload = {
      to: "eip155:5000:0x0000000000000000000000000000000000000001",
      calldata: "AA==",
      value: "0",
      gas_limit: 21000,
    };

    expect(buildEvmTransactionFromPrintrPayload(payload)).toEqual({
      to: "0x0000000000000000000000000000000000000001",
      data: "0x00",
      value: 0n,
      gas: 21000n,
    });
  });
});

