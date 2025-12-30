import { describe, expect, test } from "bun:test";

import { readApiResponse, readResponseBody } from "@/lib/api-response";

describe("readResponseBody", () => {
  test("parses JSON when possible", async () => {
    const res = new Response(JSON.stringify({ ok: true }));
    await expect(readResponseBody(res)).resolves.toEqual({ ok: true });
  });

  test("returns text when JSON parsing fails", async () => {
    const res = new Response("plain text");
    await expect(readResponseBody(res)).resolves.toBe("plain text");
  });
});

describe("readApiResponse", () => {
  test("returns parsed body for ok responses", async () => {
    const res = new Response(JSON.stringify({ data: 123 }), { status: 200 });
    const body = await readApiResponse<{ data: number }>(res, "fallback");
    expect(body.data).toBe(123);
  });

  test("throws an ApiError using server-provided error", async () => {
    const res = new Response(JSON.stringify({ error: "Bad request" }), { status: 400 });

    await expect(readApiResponse(res, "fallback")).rejects.toMatchObject({
      message: "Bad request",
      status: 400,
    });
  });

  test("uses fallback message when body has no extractable error", async () => {
    const res = new Response("not json", { status: 500 });

    await expect(readApiResponse(res, "Something went wrong")).rejects.toMatchObject({
      message: "Something went wrong",
      status: 500,
    });
  });

  test("supports function fallback messages", async () => {
    const res = new Response("no details", { status: 418 });

    await expect(
      readApiResponse(res, ({ status }) => `Fallback ${status}`),
    ).rejects.toMatchObject({
      message: "Fallback 418",
      status: 418,
    });
  });
});
