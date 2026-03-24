import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        
        // Restore last selected store
        const saved = localStorage.getItem("orderly-active-store");
        if (saved && allStores?.find((s) => s.id === saved)) {
          setStoreId(saved);
          setStoreName(allStores.find((s) => s.id === saved)?.name ?? null);
        } else if (allStores && allStores.length > 0) {
          setStoreId(allStores[0].id);
          setStoreName(allStores[0].name);
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
          setStoreId(userStores[0].id);
          setStoreName(userStores[0].name);
        }
      }
    } catch (err) {
      console.error("StoreContext: erro ao carregar contexto", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserContext(session.user.id);
      } else {
        setStoreId(null);
        setStoreName(null);
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
    setStoreId(id);
    const found = stores.find((s) => s.id === id);
    setStoreName(found?.name ?? null);
    localStorage.setItem("orderly-active-store", id);
  }, [stores]);

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
