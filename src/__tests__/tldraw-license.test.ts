/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("tldraw license config (regression)", () => {
  test(".env.example documents the public license key", () => {
    const content = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(content).toContain("NEXT_PUBLIC_TLDRAW_LICENSE_KEY=");
  });

  test("canvas page references NEXT_PUBLIC_TLDRAW_LICENSE_KEY to avoid silent disconnect loops", () => {
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

    expect(content).toContain("NEXT_PUBLIC_TLDRAW_LICENSE_KEY");
    expect(content).toContain("Missing tldraw license key");
  });
});
