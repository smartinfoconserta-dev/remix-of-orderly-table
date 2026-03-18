export const TABLET_BINDING_STORAGE_KEY = "obsidian-cliente-mesa-fixa";
export const TABLET_BINDING_CHANGED_EVENT = "obsidian-tablet-binding-changed";
export const TABLET_LOGIN_STORAGE_KEY = "obsidian-tablet-login-v1";
export const TABLET_LOGIN_CHANGED_EVENT = "obsidian-tablet-login-changed";

const emitTabletBindingChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TABLET_BINDING_CHANGED_EVENT));
};

const emitTabletLoginChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TABLET_LOGIN_CHANGED_EVENT));
};

const normalizeMesaId = (mesaId: string) => mesaId.trim();
const normalizeTabletLogin = (username: string) => username.trim().toLocaleLowerCase("pt-BR");

export const getBoundTabletMesaId = () => {
  if (typeof window === "undefined") return null;

  const mesaId = window.localStorage.getItem(TABLET_BINDING_STORAGE_KEY)?.trim();
  return mesaId || null;
};

export const setBoundTabletMesaId = (mesaId: string) => {
  const normalizedMesaId = normalizeMesaId(mesaId);
  if (!normalizedMesaId) return null;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(TABLET_BINDING_STORAGE_KEY, normalizedMesaId);
    emitTabletBindingChanged();
  }

  return normalizedMesaId;
};

export const clearBoundTabletMesaId = () => {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(TABLET_BINDING_STORAGE_KEY);
  emitTabletBindingChanged();
};

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
