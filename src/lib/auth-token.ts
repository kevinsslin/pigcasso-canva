type AuthTokenGetter = () => Promise<string | null>;

let authTokenGetter: AuthTokenGetter | null = null;

export const setAuthTokenGetter = (getter: AuthTokenGetter) => {
  authTokenGetter = getter;
};

export const getAuthToken = async () => {
  return authTokenGetter ? await authTokenGetter() : null;
};

