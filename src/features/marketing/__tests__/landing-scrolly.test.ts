/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Landing page effects (UX regression)", () => {
  test("does not include the scroll-driven story section", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "features", "marketing", "pages", "landing-page.tsx"),
      "utf8",
    );

    expect(content).not.toContain("<ScrollStory");
    expect(content).not.toContain('id="story"');
  });
});
