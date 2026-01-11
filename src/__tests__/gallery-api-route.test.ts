/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Gallery API route (regression)", () => {
  test("mounts /api/gallery", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "app", "api", "[[...route]]", "route.ts"),
      "utf8",
    );
    expect(content).toContain('.route("/gallery", gallery)');
  });
});

