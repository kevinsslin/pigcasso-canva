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
});

