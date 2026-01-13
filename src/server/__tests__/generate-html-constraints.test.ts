/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("HTML generation constraints (regression)", () => {
  test("discourages effects that break HTML previews", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "server", "ai", "gemini", "generate-html.ts"),
      "utf8",
    );

    expect(content).toContain("Avoid effects that commonly break HTML-to-image previews");
    expect(content).toContain("backdrop-filter");
    expect(content).toContain("filter blur");
  });
});
