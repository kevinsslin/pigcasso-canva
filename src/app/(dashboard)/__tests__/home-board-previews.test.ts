/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("App Home board previews (UX regression)", () => {
  test("renders recent board cover thumbnails when available", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "app", "(dashboard)", "app", "page.tsx"),
      "utf8",
    );

    expect(content).toContain('import Image from "next/image"');
    expect(content).toContain("coverImageUrl");
  });
});

