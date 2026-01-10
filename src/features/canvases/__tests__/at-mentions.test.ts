/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { applyAtMentionReplacement, getActiveAtMention } from "@/features/canvases/lib/at-mentions";

describe("at-mentions", () => {
  test("getActiveAtMention returns null when no @ token", () => {
    expect(getActiveAtMention("hello")).toBeNull();
  });

  test("getActiveAtMention returns active token at end", () => {
    expect(getActiveAtMention("hello @im")).toEqual({ start: 6, query: "im" });
    expect(getActiveAtMention("@")).toEqual({ start: 0, query: "" });
  });

  test("getActiveAtMention ignores @ when followed by whitespace", () => {
    expect(getActiveAtMention("hello @im there")).toBeNull();
  });

  test("applyAtMentionReplacement replaces the active token", () => {
    expect(applyAtMentionReplacement("hello @im", "Image 1")).toBe("hello @Image 1 ");
  });

  test("applyAtMentionReplacement appends when there is no active token", () => {
    expect(applyAtMentionReplacement("hello", "Frame")).toBe("hello @Frame ");
  });
});

