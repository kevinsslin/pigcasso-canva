import { describe, expect, test } from "bun:test";

import { hasIpfsConfigured } from "@/server/ipfs";

describe("hasIpfsConfigured", () => {
  test("returns false when PINATA_JWT missing", () => {
    const previous = process.env.PINATA_JWT;
    delete process.env.PINATA_JWT;

    try {
      expect(hasIpfsConfigured()).toBe(false);
    } finally {
      process.env.PINATA_JWT = previous;
    }
  });

  test("returns false when PINATA_JWT blank", () => {
    const previous = process.env.PINATA_JWT;
    process.env.PINATA_JWT = "   ";

    try {
      expect(hasIpfsConfigured()).toBe(false);
    } finally {
      process.env.PINATA_JWT = previous;
    }
  });

  test("returns true when PINATA_JWT present", () => {
    const previous = process.env.PINATA_JWT;
    process.env.PINATA_JWT = "pinata_jwt_token";

    try {
      expect(hasIpfsConfigured()).toBe(true);
    } finally {
      process.env.PINATA_JWT = previous;
    }
  });
});

