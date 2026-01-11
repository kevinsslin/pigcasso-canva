import { describe, expect, test } from "bun:test";

import { parseExtractTextBlocksResponse } from "@/server/ai/gemini";

describe("extract text blocks parser", () => {
  test("parses plain JSON", () => {
    const parsed = parseExtractTextBlocksResponse(
      JSON.stringify({
        blocks: [
          {
            text: "Hello",
            box: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 },
            font: "sans",
            size: "m",
            color: "black",
            align: "start",
          },
        ],
      }),
    );
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0]?.text).toBe("Hello");
  });

  test("parses fenced JSON", () => {
    const parsed = parseExtractTextBlocksResponse(
      "```json\n{\n  \"blocks\": [{\"text\":\"A\",\"box\":{\"x\":0,\"y\":0,\"w\":1,\"h\":1}}]\n}\n```",
    );
    expect(parsed.blocks[0]?.text).toBe("A");
  });

  test("throws on invalid json", () => {
    expect(() => parseExtractTextBlocksResponse("not json")).toThrow();
  });

  test("normalizes percent coordinates and truncates to 40 blocks", () => {
    const payload = {
      blocks: Array.from({ length: 60 }, (_, idx) => ({
        text: `T${idx + 1}`,
        box: { x: 10, y: 20, w: 30, h: 5 },
      })),
    };

    const parsed = parseExtractTextBlocksResponse(JSON.stringify(payload));
    expect(parsed.blocks).toHaveLength(40);
    expect(parsed.blocks[0]?.box).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.05 });
  });

  test("drops invalid blocks instead of failing", () => {
    const parsed = parseExtractTextBlocksResponse(
      JSON.stringify({
        blocks: [
          { text: "Hello", box: { x: 0, y: 0, w: 1, h: 1 } },
          { text: "Missing box" },
          { text: "", box: { x: 0, y: 0, w: 1, h: 1 } },
        ],
      }),
    );
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0]?.text).toBe("Hello");
  });
});
