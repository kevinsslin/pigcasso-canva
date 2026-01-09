/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { PROMPT_PRESETS } from "@/features/prompts/prompt-presets";

describe("PROMPT_PRESETS", () => {
  test("includes core consumer categories", () => {
    const labels = PROMPT_PRESETS.map((preset) => preset.label);

    for (const required of ["Design", "Branding", "Illustration", "Video"]) {
      expect(labels).toContain(required);
    }
  });

  test("has unique ids and non-empty prompts", () => {
    const ids = PROMPT_PRESETS.map((preset) => preset.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const preset of PROMPT_PRESETS) {
      expect(preset.prompt.trim().length).toBeGreaterThan(0);
    }
  });
});

