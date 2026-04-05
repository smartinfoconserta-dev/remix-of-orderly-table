// src/lib/sessionManager.ts
// Centraliza acesso ao storeId da sessão ativa.
// TODA parte do sistema que precisa do storeId deve importar daqui.

let _cachedStoreId: string | null = null;

export const getActiveStoreId = (): string | null => {
  // 1. Try operational session (PIN login — caixa, garçom, cozinha, etc)
  try {
    const raw = sessionStorage.getItem("obsidian-op-session-v2");
    if (raw) {
      const s = JSON.parse(raw);
      if (s.storeId) { _cachedStoreId = s.storeId; return s.storeId; }
    }
  } catch {}

  // 2. Try persisted operational session (survives tab close)
  try {
    const persistedRaw = localStorage.getItem("obsidian-op-session-v2-persisted");
    if (persistedRaw) {
      const s = JSON.parse(persistedRaw);
      if (s.storeId) {
        sessionStorage.setItem("obsidian-op-session-v2", persistedRaw);
        _cachedStoreId = s.storeId;
        return s.storeId;
      }
    }
  } catch {}

  // 3. Try admin store (Supabase auth login) — now in localStorage
  try {
    const saved = localStorage.getItem("orderly-active-store")
      || sessionStorage.getItem("orderly-active-store");
    if (saved) { _cachedStoreId = saved; return saved; }
  } catch {}

  // 4. Try device store (tablet/totem/tv activated via DeviceGate)
  try {
    const deviceStore = sessionStorage.getItem("orderly-device-store-id")
      || localStorage.getItem("orderly-device-store-id");
    if (deviceStore) {
      sessionStorage.setItem("orderly-device-store-id", deviceStore);
      _cachedStoreId = deviceStore;
      return deviceStore;
    }
  } catch {}

  // 5. Fallback to cached value
  return _cachedStoreId;
};

// Reset cache (used on logout)
export const clearStoreIdCache = () => {
  _cachedStoreId = null;
};
