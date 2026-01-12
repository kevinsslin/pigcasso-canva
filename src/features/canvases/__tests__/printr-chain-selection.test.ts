/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Printr chain selection (regression)", () => {
  test("canvas launch dialog wires selected chain into request payload", () => {
    const content = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "canvases",
        "screens",
        "canvas-screen",
        "canvas-printr-launch-dialog.tsx",
      ),
      "utf8",
    );

    expect(content).toContain("PRINTR_EVM_CHAIN_OPTIONS");
    expect(content).toContain("chains: [selectedChain]");
    expect(content).toContain("creator_accounts: [`${selectedChain}:");
  });
});

