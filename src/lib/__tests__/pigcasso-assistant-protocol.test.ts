import { describe, expect, test } from "bun:test";

import { canvasOpSchema } from "@/lib/pigcasso-assistant-protocol";

describe("pigcasso assistant protocol", () => {
  test("accepts ratio coordinates", () => {
    const op = canvasOpSchema.parse({
      op: "move",
      targetId: "o0",
      x: 0.5,
      y: 0.25,
      anchor: "center",
    });

    expect(op.op).toBe("move");
  });

  test("accepts pixel-like coordinates (server will normalize)", () => {
    const move = canvasOpSchema.parse({
      op: "move",
      targetId: "o0",
      x: 420,
      y: 180,
      anchor: "topLeft",
    });

    expect(move.op).toBe("move");

    const add = canvasOpSchema.parse({
      op: "addTextbox",
      text: "Hello",
      x: 960,
      y: 540,
      widthPct: 1200,
      role: "title",
    });

    expect(add.op).toBe("addTextbox");
  });

  test("rejects non-finite values", () => {
    expect(() =>
      canvasOpSchema.parse({
        op: "move",
        targetId: "o0",
        x: Infinity,
      }),
    ).toThrow();
  });
});

