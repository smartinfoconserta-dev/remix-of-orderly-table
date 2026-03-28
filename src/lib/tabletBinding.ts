export const TABLET_LOGIN_STORAGE_KEY = "obsidian-tablet-login-v1";
export const TABLET_LOGIN_CHANGED_EVENT = "obsidian-tablet-login-changed";

const emitTabletLoginChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TABLET_LOGIN_CHANGED_EVENT));
};

const normalizeTabletLogin = (username: string) => username.trim().toLocaleLowerCase("pt-BR");

export const getTabletLoginUser = () => {
  if (typeof window === "undefined") return null;

  const username = window.localStorage.getItem(TABLET_LOGIN_STORAGE_KEY)?.trim();
  return username || null;
};

export const setTabletLoginUser = (username: string) => {
  const normalizedUsername = normalizeTabletLogin(username);
  if (!normalizedUsername) return null;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(TABLET_LOGIN_STORAGE_KEY, normalizedUsername);
    emitTabletLoginChanged();
  }

  return normalizedUsername;
};

export const clearTabletLoginUser = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(TABLET_LOGIN_STORAGE_KEY);
  emitTabletLoginChanged();
};
