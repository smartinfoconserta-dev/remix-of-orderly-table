import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STORE_KEY = "orderly-active-store";
const ACTIVE_STORE_STORAGE = localStorage; // survives browser close

interface StoreContextType {
  storeId: string | null;
  storeName: string | null;
  userRole: "master" | "admin" | null;
  isLoading: boolean;
  isMaster: boolean;
  stores: { id: string; name: string; slug: string }[];
  setActiveStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  storeId: null,
  storeName: null,
  userRole: null,
  isLoading: true,
  isMaster: false,
  stores: [],
  setActiveStore: () => {},
  refreshStores: async () => {},
});

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"master" | "admin" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState<{ id: string; name: string; slug: string }[]>([]);

  const syncActiveStore = useCallback((nextStoreId: string | null, nextStoreName: string | null) => {
    setStoreId(nextStoreId);
    setStoreName(nextStoreName);

    try {
      if (nextStoreId) {
        ACTIVE_STORE_STORAGE.setItem(ACTIVE_STORE_KEY, nextStoreId);
      } else {
        ACTIVE_STORE_STORAGE.removeItem(ACTIVE_STORE_KEY);
      }
    } catch {}

    window.dispatchEvent(new Event("obsidian-store-context-changed"));
  }, []);

  const loadUserContext = useCallback(async (userId: string) => {
    try {
      // Check role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isMaster = roles?.some((r) => r.role === "master") ?? false;
      setUserRole(isMaster ? "master" : "admin");

      if (isMaster) {
        // Master sees all stores
        const { data: allStores } = await supabase
          .from("stores")
          .select("id, name, slug")
          .order("name");
        setStores(allStores ?? []);
        
        // Restore last selected store (usando sessionStorage — dura só enquanto o navegador está aberto)
        const saved = ACTIVE_STORE_STORAGE.getItem(ACTIVE_STORE_KEY);
        if (saved && allStores?.find((s) => s.id === saved)) {
          syncActiveStore(saved, allStores.find((s) => s.id === saved)?.name ?? null);
        } else if (allStores && allStores.length > 0) {
          syncActiveStore(allStores[0].id, allStores[0].name);
        } else {
          syncActiveStore(null, null);
        }
      } else {
        // Admin sees only their stores
        const { data: memberships } = await supabase
          .from("store_members")
          .select("store_id, stores(id, name, slug)")
          .eq("user_id", userId);

        const userStores = (memberships ?? [])
          .map((m: any) => m.stores)
          .filter(Boolean);
        setStores(userStores);

        if (userStores.length > 0) {
          syncActiveStore(userStores[0].id, userStores[0].name);
        } else {
          syncActiveStore(null, null);
        }
      }
    } catch (err) {
      console.error("StoreContext: erro ao carregar contexto", err);
    } finally {
      setIsLoading(false);
    }
  }, [syncActiveStore]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserContext(session.user.id);
      } else {
        syncActiveStore(null, null);
        setUserRole(null);
        setStores([]);
        setIsLoading(false);
      }
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserContext(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserContext]);

  const setActiveStore = useCallback((id: string) => {
    const found = stores.find((s) => s.id === id);
    syncActiveStore(id, found?.name ?? null);
  }, [stores, syncActiveStore]);

  const refreshStores = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserContext(session.user.id);
    }
  }, [loadUserContext]);

  return (
    <StoreContext.Provider
      value={{
        storeId,
        storeName,
        userRole,
        isLoading,
        isMaster: userRole === "master",
        stores,
        setActiveStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
