import { describe, expect, test } from "bun:test";

import {
  parsePostLoginRedirect,
  serializePostLoginRedirect,
  shouldUsePostLoginRedirect,
  toSafeRedirectPath,
} from "@/lib/post-login-redirect";

describe("post-login redirect helpers", () => {
  test("toSafeRedirectPath rejects unsafe paths", () => {
    expect(toSafeRedirectPath(null)).toBe("/app");
    expect(toSafeRedirectPath(undefined)).toBe("/app");
    expect(toSafeRedirectPath("app")).toBe("/app");
    expect(toSafeRedirectPath("//evil.com")).toBe("/app");
    expect(toSafeRedirectPath("https://evil.com")).toBe("/app");
    expect(toSafeRedirectPath("/app")).toBe("/app");
    expect(toSafeRedirectPath("/app?new=1")).toBe("/app?new=1");
  });

  test("parse/serialize roundtrip", () => {
    const raw = serializePostLoginRedirect("/app?new=1", 123);
    expect(parsePostLoginRedirect(raw)).toEqual({ path: "/app?new=1", createdAt: 123 });
  });

  test("shouldUsePostLoginRedirect expires old records", () => {
    expect(shouldUsePostLoginRedirect({ path: "/app", createdAt: 0 }, 60_000, 1_000)).toBe(false);
    expect(shouldUsePostLoginRedirect({ path: "/app", createdAt: 59_500 }, 60_000, 1_000)).toBe(true);
  });
});

