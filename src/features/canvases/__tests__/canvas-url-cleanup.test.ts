/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Canvas URL cleanup (UX regression)", () => {
  test("does not trigger Next.js navigation when clearing prompt/image params", () => {
    const content = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "canvas-screen.tsx",
      ),
      "utf8",
    );

    expect(content).not.toContain("router.replace");
    expect(content).toContain("history.replaceState");
  });
});
