/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("App home IA (UX regression)", () => {
  test("focuses on Boards + Gallery and links to Classic", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "app", "(dashboard)", "app", "page.tsx"),
      "utf8",
    );

    expect(content).toContain("Recent Boards");
    expect(content).toContain("Gallery");
    expect(content).toContain('router.push("/classic")');
    expect(content).toContain('router.push("/gallery")');
    expect(content).not.toContain("Classic Projects");
  });
});

