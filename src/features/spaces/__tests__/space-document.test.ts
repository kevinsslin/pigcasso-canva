import { describe, expect, test } from "bun:test";

import { spaceLinkSchema } from "@/features/spaces/lib/space-document";

describe("space document schema", () => {
  test("spaceLinkSchema prefixes https when missing protocol", () => {
    const parsed = spaceLinkSchema.parse({ label: "X", url: "x.com/pigcasso" });
    expect(parsed.url).toBe("https://x.com/pigcasso");
  });

  test("spaceLinkSchema rejects non-http(s) protocols", () => {
    expect(() => spaceLinkSchema.parse({ label: "Bad", url: "javascript:alert(1)" })).toThrow();
  });
});

