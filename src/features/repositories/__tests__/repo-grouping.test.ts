import { describe, expect, test } from "bun:test";

import { groupReposByOwner } from "@/features/repositories/lib/repo-grouping";

describe("repo grouping helpers", () => {
  test("groups by owner and puts personal login first (case-insensitive)", () => {
    const repos = [
      {
        name: "alpha",
        fullName: "org/alpha",
        owner: { login: "org", avatarUrl: null },
      },
      {
        name: "beta",
        fullName: "me/beta",
        owner: { login: "Me", avatarUrl: "https://example.com/me.png" },
      },
      {
        name: "gamma",
        fullName: "org/gamma",
        owner: { login: "org", avatarUrl: "https://example.com/org.png" },
      },
    ];

    const groups = groupReposByOwner(repos, { personalLogin: "me" });

    expect(groups.map((group) => group.ownerLogin)).toEqual(["Me", "org"]);
    expect(groups[0].isPersonal).toBe(true);
    expect(groups[0].ownerAvatarUrl).toBe("https://example.com/me.png");
    expect(groups[0].repos.map((repo) => repo.fullName)).toEqual(["me/beta"]);
    expect(groups[1].repos.map((repo) => repo.fullName)).toEqual(["org/alpha", "org/gamma"]);
  });
});

