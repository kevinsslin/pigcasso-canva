import { describe, expect, test } from "bun:test";

import { hasIpfsConfigured } from "@/server/ipfs";

describe("hasIpfsConfigured", () => {
  test("returns false when PINATA_JWT missing", () => {
    const previousJwt = process.env.PINATA_JWT;
    const previousKey = process.env.PINATA_API_KEY;
    const previousSecret = process.env.PINATA_SECRET_API_KEY;
    const previousAltSecret = process.env.PINATA_API_SECRET;
    delete process.env.PINATA_JWT;
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET_API_KEY;
    delete process.env.PINATA_API_SECRET;

    try {
      expect(hasIpfsConfigured()).toBe(false);
    } finally {
      process.env.PINATA_JWT = previousJwt;
      process.env.PINATA_API_KEY = previousKey;
      process.env.PINATA_SECRET_API_KEY = previousSecret;
      process.env.PINATA_API_SECRET = previousAltSecret;
    }
  });

  test("returns false when PINATA_JWT blank", () => {
    const previousJwt = process.env.PINATA_JWT;
    const previousKey = process.env.PINATA_API_KEY;
    const previousSecret = process.env.PINATA_SECRET_API_KEY;
    const previousAltSecret = process.env.PINATA_API_SECRET;
    process.env.PINATA_JWT = "   ";
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET_API_KEY;
    delete process.env.PINATA_API_SECRET;

    try {
      expect(hasIpfsConfigured()).toBe(false);
    } finally {
      process.env.PINATA_JWT = previousJwt;
      process.env.PINATA_API_KEY = previousKey;
      process.env.PINATA_SECRET_API_KEY = previousSecret;
      process.env.PINATA_API_SECRET = previousAltSecret;
    }
  });

  test("returns true when PINATA_JWT present", () => {
    const previousJwt = process.env.PINATA_JWT;
    const previousKey = process.env.PINATA_API_KEY;
    const previousSecret = process.env.PINATA_SECRET_API_KEY;
    const previousAltSecret = process.env.PINATA_API_SECRET;
    process.env.PINATA_JWT = "pinata_jwt_token";
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET_API_KEY;
    delete process.env.PINATA_API_SECRET;

    try {
      expect(hasIpfsConfigured()).toBe(true);
    } finally {
      process.env.PINATA_JWT = previousJwt;
      process.env.PINATA_API_KEY = previousKey;
      process.env.PINATA_SECRET_API_KEY = previousSecret;
      process.env.PINATA_API_SECRET = previousAltSecret;
    }
  });

  test("returns true when PINATA_API_KEY and PINATA_SECRET_API_KEY present", () => {
    const previousJwt = process.env.PINATA_JWT;
    const previousKey = process.env.PINATA_API_KEY;
    const previousSecret = process.env.PINATA_SECRET_API_KEY;
    const previousAltSecret = process.env.PINATA_API_SECRET;
    delete process.env.PINATA_JWT;

    process.env.PINATA_API_KEY = "pinata_key";
    process.env.PINATA_SECRET_API_KEY = "pinata_secret";
    delete process.env.PINATA_API_SECRET;

    try {
      expect(hasIpfsConfigured()).toBe(true);
    } finally {
      process.env.PINATA_JWT = previousJwt;
      process.env.PINATA_API_KEY = previousKey;
      process.env.PINATA_SECRET_API_KEY = previousSecret;
      process.env.PINATA_API_SECRET = previousAltSecret;
    }
  });

  test("returns true when PINATA_API_KEY and PINATA_API_SECRET present", () => {
    const previousJwt = process.env.PINATA_JWT;
    const previousKey = process.env.PINATA_API_KEY;
    const previousSecret = process.env.PINATA_SECRET_API_KEY;
    const previousAltSecret = process.env.PINATA_API_SECRET;
    delete process.env.PINATA_JWT;

    process.env.PINATA_API_KEY = "pinata_key";
    delete process.env.PINATA_SECRET_API_KEY;
    process.env.PINATA_API_SECRET = "pinata_secret";

    try {
      expect(hasIpfsConfigured()).toBe(true);
    } finally {
      process.env.PINATA_JWT = previousJwt;
      process.env.PINATA_API_KEY = previousKey;
      process.env.PINATA_SECRET_API_KEY = previousSecret;
      process.env.PINATA_API_SECRET = previousAltSecret;
    }
  });

  test("returns false when only PINATA_API_KEY is present", () => {
    const previousJwt = process.env.PINATA_JWT;
    const previousKey = process.env.PINATA_API_KEY;
    const previousSecret = process.env.PINATA_SECRET_API_KEY;
    const previousAltSecret = process.env.PINATA_API_SECRET;
    delete process.env.PINATA_JWT;

    process.env.PINATA_API_KEY = "pinata_key";
    delete process.env.PINATA_SECRET_API_KEY;
    delete process.env.PINATA_API_SECRET;

    try {
      expect(hasIpfsConfigured()).toBe(false);
    } finally {
      process.env.PINATA_JWT = previousJwt;
      process.env.PINATA_API_KEY = previousKey;
      process.env.PINATA_SECRET_API_KEY = previousSecret;
      process.env.PINATA_API_SECRET = previousAltSecret;
    }
  });
});
