import { describe, expect, test } from "bun:test";

import {
  getAvatarFallbackText,
  getUserDisplayLabel,
  shortenWalletAddress,
} from "@/features/auth/lib/user-display";

describe("user display helpers", () => {
  test("shortens wallet addresses", () => {
    expect(shortenWalletAddress("0x1234567890")).toBe("0x1234567890");
    expect(shortenWalletAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678",
    );
  });

  test("prefers name, then email, then wallet", () => {
    expect(
      getUserDisplayLabel({
        name: "  Kevin  ",
        email: "kevin@example.com",
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      }),
    ).toBe("Kevin");

    expect(
      getUserDisplayLabel({
        name: " ",
        email: "  kevin@example.com ",
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      }),
    ).toBe("kevin@example.com");

    expect(
      getUserDisplayLabel({
        name: null,
        email: null,
        walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
      }),
    ).toBe("0x1234...5678");

    expect(getUserDisplayLabel({})).toBe("Account");
  });

  test("derives avatar fallback text", () => {
    expect(getAvatarFallbackText("kevin")).toBe("K");
    expect(getAvatarFallbackText("   ")).toBe("A");
  });
});

