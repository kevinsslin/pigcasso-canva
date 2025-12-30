import { describe, expect, test } from "bun:test";

import {
  createApiError,
  extractBodyErrorMessage,
  getApiErrorStatus,
} from "@/lib/api-error";

describe("extractBodyErrorMessage", () => {
  test("returns null for non-object bodies", () => {
    expect(extractBodyErrorMessage(null)).toBeNull();
    expect(extractBodyErrorMessage("nope")).toBeNull();
  });

  test("reads direct error string", () => {
    expect(extractBodyErrorMessage({ error: "Something broke" })).toBe("Something broke");
  });

  test("reads nested error objects", () => {
    expect(extractBodyErrorMessage({ error: { message: "Nested message" } })).toBe(
      "Nested message",
    );
    expect(extractBodyErrorMessage({ error: { detail: "Nested detail" } })).toBe(
      "Nested detail",
    );
    expect(extractBodyErrorMessage({ error: { title: "Nested title" } })).toBe(
      "Nested title",
    );
  });

  test("reads top-level message/detail", () => {
    expect(extractBodyErrorMessage({ message: "Top message" })).toBe("Top message");
    expect(extractBodyErrorMessage({ detail: "Top detail" })).toBe("Top detail");
  });

  test("joins error arrays", () => {
    expect(extractBodyErrorMessage({ errors: ["a", "b"] })).toBe("a, b");
  });
});

describe("getApiErrorStatus", () => {
  test("returns status when present", () => {
    const err = createApiError({ message: "bad", status: 401 });
    expect(getApiErrorStatus(err)).toBe(401);
  });

  test("returns undefined for non-errors", () => {
    expect(getApiErrorStatus(null)).toBeUndefined();
    expect(getApiErrorStatus("oops")).toBeUndefined();
  });
});

