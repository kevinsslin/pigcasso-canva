/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Landing page (UX regression)", () => {
  test("links to the public gallery", () => {
    const content = readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8");
    expect(content).toContain('href="/gallery"');
  });
});

