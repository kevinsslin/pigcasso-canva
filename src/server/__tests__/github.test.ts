import { afterEach, describe, expect, test } from "bun:test";

import { HttpError } from "@/server/http-error";
import { getGithubViewer, listGithubRepos } from "@/server/github";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("github", () => {
  test("maps GitHub 401 to HttpError 400 (avoid app-level 401 handling)", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Bad credentials" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });

    try {
      await getGithubViewer("bad-token");
      throw new Error("Expected getGithubViewer to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
      expect((error as Error).message).toContain("Bad credentials");
    }
  });

  test("maps GitHub 5xx to HttpError 502", async () => {
    globalThis.fetch = async () =>
      new Response("upstream error", {
        status: 500,
        statusText: "Internal Server Error",
      });

    await expect(listGithubRepos("token")).rejects.toMatchObject({
      status: 502,
    });
  });

  test("parses viewer payload", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          id: 123,
          login: "octocat",
          avatar_url: "https://avatars.githubusercontent.com/u/123?v=4",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );

    await expect(getGithubViewer("token")).resolves.toEqual({
      id: "123",
      login: "octocat",
      avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
    });
  });
});

