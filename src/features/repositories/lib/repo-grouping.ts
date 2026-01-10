export type RepoListItem = {
  name: string;
  fullName: string;
  owner: {
    login: string;
    avatarUrl: string | null;
  };
};

export type RepoOwnerGroup<TRepo extends RepoListItem = RepoListItem> = {
  ownerLogin: string;
  ownerAvatarUrl: string | null;
  isPersonal: boolean;
  repos: TRepo[];
};

const normalizeLogin = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export const groupReposByOwner = <TRepo extends RepoListItem>(
  repos: TRepo[],
  options?: { personalLogin?: string | null },
): RepoOwnerGroup<TRepo>[] => {
  const map = new Map<string, TRepo[]>();

  repos.forEach((repo) => {
    const ownerLogin = repo.owner?.login ?? "unknown";
    const list = map.get(ownerLogin);
    if (list) {
      list.push(repo);
      return;
    }
    map.set(ownerLogin, [repo]);
  });

  const personalLogin = normalizeLogin(options?.personalLogin);

  const groups = Array.from(map.entries()).map(([ownerLogin, list]) => {
    const avatarUrl = list[0]?.owner?.avatarUrl ?? null;
    return {
      ownerLogin,
      ownerAvatarUrl: avatarUrl,
      isPersonal: personalLogin.length > 0 && normalizeLogin(ownerLogin) === personalLogin,
      repos: list,
    } satisfies RepoOwnerGroup<TRepo>;
  });

  groups.sort((a, b) => {
    if (a.isPersonal !== b.isPersonal) return a.isPersonal ? -1 : 1;
    return a.ownerLogin.localeCompare(b.ownerLogin);
  });

  return groups;
};

