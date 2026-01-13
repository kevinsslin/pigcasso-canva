/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Landing page scrollytelling (UX regression)", () => {
  test("includes scroll-driven story section", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "features", "marketing", "pages", "landing-page.tsx"),
      "utf8",
    );

    expect(content).toContain("<ScrollStory");
    expect(content).toContain('id="story"');
  });
});

