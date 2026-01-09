import { afterEach, describe, expect, test } from "bun:test";

import { toPublicApiError } from "@/server/api-error-response";
import { HttpError } from "@/server/http-error";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

describe("toPublicApiError", () => {
  test("hides 5xx messages in production unless expose=true", () => {
    process.env.NODE_ENV = "production";

    expect(toPublicApiError(new HttpError(500, "Sensitive details")).body.error).toBe(
      "Internal Server Error",
    );

    expect(
      toPublicApiError(new HttpError(500, "Safe details", { expose: true })).body.error,
    ).toBe("Safe details");
  });

  test("includes code when provided", () => {
    process.env.NODE_ENV = "production";

    const result = toPublicApiError(
      new HttpError(500, "Server misconfigured: Missing FOO", {
        expose: true,
        code: "MISSING_FOO",
      }),
    );

    expect(result.body).toEqual({
      error: "Server misconfigured: Missing FOO",
      code: "MISSING_FOO",
    });
  });

  test("always returns Unauthorized for 401 in production", () => {
    process.env.NODE_ENV = "production";

    expect(toPublicApiError(new HttpError(401, "Missing Authorization bearer token")).body.error).toBe(
      "Unauthorized",
    );
  });

  test("exposes non-prod messages for 5xx", () => {
    process.env.NODE_ENV = "development";

    expect(toPublicApiError(new Error("boom")).body.error).toBe("boom");
  });
});

