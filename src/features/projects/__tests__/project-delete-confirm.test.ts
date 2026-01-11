/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Project deletion (UX regression)", () => {
  test("requires typing DELETE before removing a project", () => {
    const content = readFileSync(
      join(process.cwd(), "src", "app", "(dashboard)", "projects-section.tsx"),
      "utf8",
    );

    expect(content).toContain("Type DELETE");
    expect(content).toContain("variant=\"destructive\"");
  });
});

