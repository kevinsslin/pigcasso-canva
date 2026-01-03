export type SpaceHandleIdentity = {
  id: string;
  socials: {
    twitter: { username: string | null } | null;
    discord: { username: string | null } | null;
    telegram: { username: string | null } | null;
  };
};

export const getCanonicalSpaceHandle = (identity: SpaceHandleIdentity) =>
  identity.socials.twitter?.username ||
  identity.socials.discord?.username ||
  identity.socials.telegram?.username ||
  identity.id;

