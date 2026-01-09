import { describe, expect, test } from "bun:test";
import { HTTPException } from "hono/http-exception";

import { HttpError, getErrorStatus } from "@/server/http-error";

describe("getErrorStatus", () => {
  test("supports HttpError", () => {
    expect(getErrorStatus(new HttpError(401, "nope"))).toBe(401);
  });

  test("defaults expose=true for 4xx and false for 5xx", () => {
    expect(new HttpError(400, "bad").expose).toBe(true);
    expect(new HttpError(500, "bad").expose).toBe(false);
    expect(new HttpError(500, "bad", { expose: true }).expose).toBe(true);
  });

  test("supports Hono HTTPException", () => {
    expect(getErrorStatus(new HTTPException(418, { message: "teapot" }))).toBe(418);
  });

  test("supports plain objects with status fields", () => {
    expect(getErrorStatus({ status: 500 })).toBe(500);
    expect(getErrorStatus({ response: { status: 502 } })).toBe(502);
  });

  test("returns undefined for unknown shapes", () => {
    expect(getErrorStatus("nope")).toBeUndefined();
    expect(getErrorStatus(null)).toBeUndefined();
    expect(getErrorStatus({})).toBeUndefined();
  });
});
