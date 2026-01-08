/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { buildRepositoryMemePrompt } from "@/server/repository-to-asset";

describe("buildRepositoryMemePrompt", () => {
  test("includes repo identity and trims README", () => {
    const prompt = buildRepositoryMemePrompt({
      repo: {
        id: 1,
        name: "awesome-repo",
        fullName: "octo/awesome-repo",
        owner: { login: "octo", avatarUrl: null },
        private: false,
        description: "An awesome repo",
        htmlUrl: "https://github.com/octo/awesome-repo",
        language: "TypeScript",
        stargazersCount: 42,
        forksCount: 7,
        updatedAt: new Date().toISOString(),
        topics: ["vibe-coding", "web3"],
        defaultBranch: "main",
      },
      languages: { TypeScript: 100, CSS: 5 },
      readme:
        "Hello world\n\n```ts\nconsole.log('secret')\n```\n\nThis is a README with lots of words.\n",
    });

    expect(prompt).toContain("Repository: octo/awesome-repo");
    expect(prompt).toContain("Top languages: TypeScript, CSS");
    expect(prompt).not.toContain("console.log");
  });
});

