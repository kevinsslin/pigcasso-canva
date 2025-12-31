import { describe, expect, test } from "bun:test";

import { normalizeGeminiError } from "@/server/ai-errors";

describe("ai error normalization", () => {
  test("maps Gemini 429 to a quota message", () => {
    const err = normalizeGeminiError({ status: 429 });
    expect(err.status).toBe(429);
    expect(err.message.toLowerCase()).toContain("quota");
  });

  test("maps Gemini 401 to an auth/config message", () => {
    const err = normalizeGeminiError({ status: 401 });
    expect(err.status).toBe(401);
    expect(err.message.toLowerCase()).toContain("rejected");
    expect(err.message).not.toContain("GEMINI_API_KEY");
  });
});
