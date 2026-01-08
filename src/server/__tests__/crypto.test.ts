/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { decryptSecret, encryptSecret } from "@/server/crypto";

describe("crypto", () => {
  test("encryptSecret/decryptSecret roundtrip", () => {
    const key = Buffer.alloc(32, 7);
    const value = "super-secret-token";

    const encrypted = encryptSecret(value, key);
    expect(encrypted.startsWith("v1:")).toBe(true);

    const decrypted = decryptSecret(encrypted, key);
    expect(decrypted).toBe(value);
  });

  test("decryptSecret rejects invalid input", () => {
    const key = Buffer.alloc(32, 7);
    expect(() => decryptSecret("not-a-token", key)).toThrow();
  });
});

