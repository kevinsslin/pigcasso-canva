/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Landing page CTAs (UX regression)", () => {
  test("does not auto-create/open a board on entry", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "features", "marketing", "pages", "landing-page.tsx"),
      "utf8",
    );

    expect(content).not.toContain("/canvas/new");
    expect(content).toContain("/app?new=1");
  });
});
