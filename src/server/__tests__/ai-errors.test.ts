import { describe, expect, test } from "bun:test";

import { normalizeGeminiError, normalizeReplicateError } from "@/server/ai-errors";

describe("ai error normalization", () => {
  test("maps Replicate 402 to an actionable message", () => {
    const err = normalizeReplicateError({ status: 402 });
    expect(err.status).toBe(402);
    expect(err.message.toLowerCase()).toContain("unavailable");
  });

  test("maps Replicate 429 to a rate-limit message", () => {
    const err = normalizeReplicateError({ status: 429 });
    expect(err.status).toBe(429);
    expect(err.message.toLowerCase()).toContain("busy");
  });

  test("maps Gemini 429 to a quota message", () => {
    const err = normalizeGeminiError({ status: 429 });
    expect(err.status).toBe(429);
    expect(err.message.toLowerCase()).toContain("busy");
  });

  test("maps Gemini 401 to an auth/config message", () => {
    const err = normalizeGeminiError({ status: 401 });
    expect(err.status).toBe(401);
    expect(err.message.toLowerCase()).toContain("rejected");
    expect(err.message).not.toContain("GEMINI_API_KEY");
  });
});
