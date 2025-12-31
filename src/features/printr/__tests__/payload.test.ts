import { describe, expect, test } from "bun:test";

import { base64ToHex } from "@/features/printr/lib/base64";
import {
  buildEvmTransactionFromPrintrPayload,
  getPayloadEip155ChainId,
  isPrintrEvmPayload,
} from "@/features/printr/lib/payload";

describe("printr payload helpers", () => {
  test("converts base64 calldata to hex", () => {
    expect(base64ToHex("AQID")).toBe("0x010203");
    expect(base64ToHex("EjQ=")).toBe("0x1234");
  });

  test("builds an EVM tx from payload", () => {
    const payload = {
      to: "eip155:5000:0x000000000000000000000000000000000000dEaD",
      calldata: "EjQ=",
      value: "0",
      gas_limit: 21000,
    };

    expect(isPrintrEvmPayload(payload)).toBe(true);
    expect(getPayloadEip155ChainId(payload)).toBe(5000);

    const tx = buildEvmTransactionFromPrintrPayload(payload);
    expect(tx.to).toBe("0x000000000000000000000000000000000000dEaD");
    expect(tx.data).toBe("0x1234");
    expect(tx.value).toBe(0n);
    expect(tx.gas).toBe(21000n);
  });
});
