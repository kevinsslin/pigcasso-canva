export const AUTH_UNAUTHORIZED_EVENT = "pigcasso:unauthorized";

export const dispatchUnauthorizedEvent = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
};

