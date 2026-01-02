import { describe, expect, test } from "bun:test";

import { getCanonicalSpaceHandle, isUuid, isWalletAddress, normalizeSpaceHandle } from "@/server/space";

describe("normalizeSpaceHandle", () => {
  test("trims whitespace", () => {
    expect(normalizeSpaceHandle("  alice  ")).toBe("alice");
  });

  test("strips leading @", () => {
    expect(normalizeSpaceHandle("@alice")).toBe("alice");
  });

  test("returns empty string for blank input", () => {
    expect(normalizeSpaceHandle("   ")).toBe("");
  });
});

describe("isUuid", () => {
  test("accepts v4 UUIDs", () => {
    expect(isUuid("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
  });

  test("rejects non-UUIDs", () => {
    expect(isUuid("alice")).toBe(false);
  });
});

describe("isWalletAddress", () => {
  test("accepts 0x addresses", () => {
    expect(isWalletAddress("0x0000000000000000000000000000000000000000")).toBe(true);
    expect(isWalletAddress("0xA2F17b2C0dC6c9cA6a1c1aA9C0cB7b1A01B2c3D4")).toBe(true);
  });

  test("rejects invalid addresses", () => {
    expect(isWalletAddress("0x1234")).toBe(false);
    expect(isWalletAddress("alice")).toBe(false);
  });
});

describe("getCanonicalSpaceHandle", () => {
  test("prefers twitter username, then discord, telegram, id", () => {
    expect(
      getCanonicalSpaceHandle({
        id: "user-id",
        twitterUsername: "alice",
        discordUsername: "alice#0001",
        telegramUsername: "alice",
      }),
    ).toBe("alice");

    expect(
      getCanonicalSpaceHandle({
        id: "user-id",
        twitterUsername: null,
        discordUsername: "alice#0001",
        telegramUsername: "alice",
      }),
    ).toBe("alice#0001");

    expect(
      getCanonicalSpaceHandle({
        id: "user-id",
        twitterUsername: null,
        discordUsername: null,
        telegramUsername: "alice",
      }),
    ).toBe("alice");

    expect(
      getCanonicalSpaceHandle({
        id: "user-id",
        twitterUsername: null,
        discordUsername: null,
        telegramUsername: null,
      }),
    ).toBe("user-id");
  });
});

