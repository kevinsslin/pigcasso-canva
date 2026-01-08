import type { GithubRepoDetails } from "@/server/github";

const truncate = (value: string, maxLength: number) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
};

const normalizeReadme = (readme: string) => {
  const withoutNulls = readme.replace(/\0/g, "");
  const withoutCodeFences = withoutNulls.replace(/```[\s\S]*?```/g, "");
  return withoutCodeFences.replace(/\s+/g, " ").trim();
};

export const buildRepositoryMemePrompt = (params: {
  repo: GithubRepoDetails;
  languages: Record<string, number>;
  readme: string | null;
}) => {
  const { repo, languages, readme } = params;

  const languageList = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const topicList = (repo.topics ?? []).slice(0, 8);

  const readmeSnippet = readme
    ? truncate(normalizeReadme(readme), 500)
    : "";

  const description = repo.description?.trim() ?? "";

  const prompt = [
    "Create a single square (1:1) meme avatar image inspired by a GitHub repository.",
    "Style: cute + tech + web3, bold clean shapes, high contrast, sticker-like, modern, no watermarks.",
    "Theme: \"repository to asset\" and \"vibe coding\" — code is content creation.",
    "Avoid detailed or small text; if any text appears, keep it minimal and very legible.",
    "",
    `Repository: ${repo.fullName}`,
    description ? `Description: ${truncate(description, 180)}` : null,
    languageList.length ? `Top languages: ${languageList.join(", ")}` : null,
    topicList.length ? `Topics: ${topicList.join(", ")}` : null,
    readmeSnippet ? `README snippet: ${readmeSnippet}` : null,
    "",
    "Subject: a lovable cyber-pig mascot with subtle code motifs (brackets, cursor, terminal glow).",
    "Composition: centered avatar, clean background, ready to use as a profile image.",
  ]
    .filter(Boolean)
    .join("\n");

  return prompt;
};

