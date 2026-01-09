/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readJson = <T,>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;

describe("Deployment config (regression)", () => {
  test("vercel.json uses Bun install/build commands (prevents npm ci failures)", () => {
    const vercel = readJson<{ installCommand?: string; buildCommand?: string }>(
      join(process.cwd(), "vercel.json"),
    );

    expect(vercel.installCommand).toBe("bun install --frozen-lockfile");
    expect(vercel.buildCommand).toBe("bun run build");
  });

  test("build script keeps conditional DB migrate and Next build", () => {
    const content = readFileSync(join(process.cwd(), "scripts", "build.mjs"), "utf8");

    expect(content).toContain("SKIP_DB_MIGRATE");
    expect(content).toContain("drizzle-kit");
    expect(content).toContain("migrate");
    expect(content).toContain("next build");
  });
});

