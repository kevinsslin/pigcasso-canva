import { describe, expect, test } from "bun:test";

import { withHistorySquash } from "../tldraw/history";

describe("withHistorySquash", () => {
  test("marks and squashes on success", async () => {
    const calls: string[] = [];
    await withHistorySquash(
      {
        markHistoryStoppingPoint: (name) => {
          calls.push(`mark:${name ?? ""}`);
          return "m1";
        },
        squashToMark: (markId) => {
          calls.push(`squash:${markId}`);
        },
      },
      "ai:test",
      async () => {
        calls.push("fn");
        return 123;
      },
    );

    expect(calls).toEqual(["mark:ai:test", "fn", "squash:m1"]);
  });

  test("bails when fn throws", async () => {
    const calls: string[] = [];
    let threw = false;
    try {
      await withHistorySquash(
        {
          markHistoryStoppingPoint: (name) => {
            calls.push(`mark:${name ?? ""}`);
            return "m1";
          },
          squashToMark: (markId) => {
            calls.push(`squash:${markId}`);
          },
          bailToMark: (markId) => {
            calls.push(`bail:${markId}`);
          },
        },
        "ai:test",
        async () => {
          calls.push("fn");
          throw new Error("nope");
        },
      );
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
    expect(calls).toEqual(["mark:ai:test", "fn", "bail:m1"]);
  });
});

