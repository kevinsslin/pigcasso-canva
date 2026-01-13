/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Landing page content (UX regression)", () => {
  test("does not embed classic template demo assets", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "features", "marketing", "pages", "landing-page.tsx"),
      "utf8",
    );

    expect(content).not.toContain("/travel.png");
    expect(content).not.toContain("/flash_sale.png");
    expect(content).not.toContain("/car_sale.png");
  });
});

