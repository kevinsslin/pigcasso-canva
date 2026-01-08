const GITHUB_API_BASE_URL = "https://api.github.com";

const buildGithubHeaders = (token: string, extra?: HeadersInit): HeadersInit => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "User-Agent": "Pigcasso-Canvas",
  "X-GitHub-Api-Version": "2022-11-28",
  ...extra,
});

export type GithubViewer = {
  id: string;
  login: string;
  avatarUrl: string | null;
};

export type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  owner: {
    login: string;
    avatarUrl: string | null;
  };
  private: boolean;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
};

export type GithubRepoDetails = GithubRepo & {
  topics: string[];
  defaultBranch: string;
};

const githubFetch = async (path: string, options: RequestInit & { token: string }) => {
  const url = `${GITHUB_API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: buildGithubHeaders(options.token, options.headers),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = text || `${res.status} ${res.statusText}`.trim();
    throw new Error(`GitHub API error: ${message}`);
  }

  return res;
};

export const getGithubViewer = async (token: string): Promise<GithubViewer> => {
  const res = await githubFetch("/user", { token });
  const json = (await res.json()) as {
    id?: number;
    login?: string;
    avatar_url?: string | null;
  };

  if (!json.id || !json.login) {
    throw new Error("GitHub user info missing");
  }

  return {
    id: String(json.id),
    login: json.login,
    avatarUrl: json.avatar_url ?? null,
  };
};

const mapRepo = (repo: any): GithubRepo => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name,
  owner: {
    login: repo.owner?.login,
    avatarUrl: repo.owner?.avatar_url ?? null,
  },
  private: Boolean(repo.private),
  description: repo.description ?? null,
  htmlUrl: repo.html_url,
  language: repo.language ?? null,
  stargazersCount: repo.stargazers_count ?? 0,
  forksCount: repo.forks_count ?? 0,
  updatedAt: repo.updated_at,
});

export const listGithubRepos = async (token: string): Promise<GithubRepo[]> => {
  const repos: GithubRepo[] = [];

  const params = new URLSearchParams({
    per_page: "100",
    sort: "updated",
    direction: "desc",
    affiliation: "owner,collaborator,organization_member",
  });

  const res = await githubFetch(`/user/repos?${params.toString()}`, { token });
  const json = (await res.json()) as any[];

  if (!Array.isArray(json)) {
    throw new Error("GitHub repos response invalid");
  }

  json.forEach((repo) => {
    try {
      repos.push(mapRepo(repo));
    } catch {
      // ignore invalid rows
    }
  });

  return repos;
};

export const getGithubRepoDetails = async (
  token: string,
  params: { owner: string; repo: string },
): Promise<GithubRepoDetails> => {
  const res = await githubFetch(`/repos/${params.owner}/${params.repo}`, { token });
  const json = (await res.json()) as any;

  const base = mapRepo(json);

  return {
    ...base,
    topics: Array.isArray(json.topics) ? json.topics : [],
    defaultBranch: json.default_branch ?? "main",
  };
};

export const getGithubRepoLanguages = async (
  token: string,
  params: { owner: string; repo: string },
): Promise<Record<string, number>> => {
  const res = await githubFetch(`/repos/${params.owner}/${params.repo}/languages`, {
    token,
  });
  const json = (await res.json()) as Record<string, number>;

  if (!json || typeof json !== "object") {
    return {};
  }

  return json;
};

export const getGithubRepoReadme = async (
  token: string,
  params: { owner: string; repo: string },
): Promise<string | null> => {
  try {
    const res = await githubFetch(`/repos/${params.owner}/${params.repo}/readme`, {
      token,
      headers: {
        Accept: "application/vnd.github.raw",
      },
    });

    return await res.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("404")) {
      return null;
    }
    return null;
  }
};

