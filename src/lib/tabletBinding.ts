export const TABLET_BINDING_STORAGE_KEY = "obsidian-cliente-mesa-fixa";
export const TABLET_BINDING_CHANGED_EVENT = "obsidian-tablet-binding-changed";

const emitTabletBindingChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TABLET_BINDING_CHANGED_EVENT));
};

const normalizeMesaId = (mesaId: string) => mesaId.trim();

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
