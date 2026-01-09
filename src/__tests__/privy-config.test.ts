/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Privy config (onboarding regression)", () => {
  test("does not force embedded wallet creation on login", () => {
    const content = readFileSync(join(process.cwd(), "src", "components", "providers.tsx"), "utf8");
    expect(content).toContain('createOnLogin: "off"');
  });
});

