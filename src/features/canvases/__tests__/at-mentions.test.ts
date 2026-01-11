/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  applyAtMentionReplacementAtCursor,
  getActiveAtMentionAtCursor,
} from "@/features/canvases/lib/at-mentions";

describe("at mention helpers", () => {
  test("getActiveAtMentionAtCursor detects mentions at the caret (even mid-string)", () => {
    expect(getActiveAtMentionAtCursor("hello world", 5)).toBeNull();

    const tail = getActiveAtMentionAtCursor("Hi @Frame", "Hi @Frame".length);
    expect(tail?.start).toBe(3);
    expect(tail?.query).toBe("Frame");

    const mid = getActiveAtMentionAtCursor("Hi @Fr world", 6); // caret after "r"
    expect(mid?.start).toBe(3);
    expect(mid?.query).toBe("Fr");
  });

  test("applyAtMentionReplacementAtCursor replaces the active mention without forcing mention to the end", () => {
    const replaced = applyAtMentionReplacementAtCursor("Hi @Fr world", "Frame 1", 6);
    expect(replaced.value).toBe("Hi @Frame 1 world");
    expect(replaced.cursorIndex).toBe("Hi @Frame 1 ".length);
  });

  test("applyAtMentionReplacementAtCursor inserts when no active mention exists", () => {
    const inserted = applyAtMentionReplacementAtCursor("Hi world", "Frame 1", 2);
    expect(inserted.value).toBe("Hi @Frame 1 world");
  });
});

