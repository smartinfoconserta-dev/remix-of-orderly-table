import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OperationalUser, UserRole } from "@/types/operations";
import type { User } from "@supabase/supabase-js";

/* ─── Types ─── */

type AuthLevel = "unauthenticated" | "master" | "admin" | "operational";

interface OperationalSession {
  storeId: string;
  storeSlug: string;
  storeName: string;
  module: string;
  pinLabel: string | null;
}

interface LoginUnifiedResult {
  ok: boolean;
  error?: string;
  redirect?: string;
}

interface LoginResult {
  ok: boolean;
  error?: string;
}

const STORE_ROLE_PRIORITY: Record<string, number> = {
  owner: 100,
  admin: 90,
  gerente: 80,
  caixa: 70,
  cozinha: 60,
  garcom: 50,
  motoboy: 40,
  totem: 30,
  tv_retirada: 20,
  cliente: 10,
};

interface AuthContextType {
  /** Current authentication level */
  authLevel: AuthLevel;
  /** Supabase user (master/admin/store_member) */
  supabaseUser: User | null;
  /** True while checking initial session */
  isLoading: boolean;

  /* ─── Unified login ─── */
  loginUnified: (email: string, password: string) => Promise<LoginUnifiedResult>;

  /* ─── Level 1 & 2: Supabase Auth (legacy, kept for backward compat) ─── */
  loginAsMaster: (email: string, password: string) => Promise<LoginResult>;
  loginAsAdmin: (email: string, password: string) => Promise<LoginResult>;

  /* ─── Level 3: Operational PIN ─── */
  loginAsOperational: (storeSlug: string, module: string, pin: string) => Promise<LoginResult>;
  loginByPin: (storeSlug: string, pin: string) => Promise<LoginResult & { module?: string }>;
  operationalSession: OperationalSession | null;

  /* ─── Universal logout ─── */
  logout: (role?: UserRole) => Promise<void>;

  /* ─── Legacy stubs (backward compat) ─── */
  currentGarcom: OperationalUser | null;
  currentCaixa: OperationalUser | null;
  currentGerente: OperationalUser | null;
  getProfilesByRole: (role: UserRole) => OperationalUser[];
  getActiveProfilesByRole: (role: UserRole) => OperationalUser[];
  loginWithPin: (role: UserRole, nome: string, pin: string) => Promise<{ ok: boolean; error?: string; user?: OperationalUser }>;
  createUser: (role: UserRole, nome: string, pin: string) => { ok: boolean; error?: string; user?: OperationalUser };
  removeUser: (id: string) => { ok: boolean; error?: string };
  deactivateUser: (id: string) => { ok: boolean; error?: string };
  activateUser: (id: string) => { ok: boolean; error?: string };
  verifyManagerAccess: (nome: string, pin: string) => Promise<{ ok: boolean; error?: string; user?: OperationalUser }>;
  verifyEmployeeAccess: (nome: string, pin: string) => Promise<{ ok: boolean; error?: string; user?: OperationalUser }>;
  /** @deprecated Use logout() instead */
  logout_role: (role: UserRole) => void;
}

/* ─── Storage keys ─── */

const OP_SESSION_KEY = "obsidian-op-session-v2";
const OP_SESSION_PERSISTED_KEY = "obsidian-op-session-v2-persisted";

/* ─── Context setup (HMR-safe) ─── */

const authContextStore = globalThis as typeof globalThis & {
  __obsidianAuthContext__?: React.Context<AuthContextType | null>;
};
const AuthContext = authContextStore.__obsidianAuthContext__ ?? createContext<AuthContextType | null>(null);
authContextStore.__obsidianAuthContext__ = AuthContext;

/* ─── Helpers ─── */

const readOpSession = (): OperationalSession | null => {
  try {
    const raw = sessionStorage.getItem(OP_SESSION_KEY);
    if (raw) return JSON.parse(raw) as OperationalSession;
    const persisted = localStorage.getItem(OP_SESSION_PERSISTED_KEY);
    if (!persisted) return null;
    const parsed = JSON.parse(persisted) as OperationalSession;
    sessionStorage.setItem(OP_SESSION_KEY, persisted);
    return parsed;
  } catch (err) {
    console.error("[AuthContext] erro:", err);
    return null;
  }
};

const writeOpSession = (session: OperationalSession | null) => {
  if (session) {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(OP_SESSION_KEY, serialized);
    localStorage.setItem(OP_SESSION_PERSISTED_KEY, serialized);
  } else {
    sessionStorage.removeItem(OP_SESSION_KEY);
    localStorage.removeItem(OP_SESSION_PERSISTED_KEY);
  }
};

/* ─── Legacy stub error ─── */
const LEGACY_ERROR = "Use o novo sistema de login";

/* ─── Provider ─── */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [authLevel, setAuthLevel] = useState<AuthLevel>("unauthenticated");
  const [isLoading, setIsLoading] = useState(true);
  const [operationalSession, setOperationalSession] = useState<OperationalSession | null>(readOpSession);

  /* ─── Resolve auth level from Supabase user ─── */
  interface ResolvedAuth {
    level: AuthLevel;
    opSession?: OperationalSession;
    redirect?: string;
    queryFailed?: boolean;
  }

  const resolveSupabaseLevel = useCallback(async (user: User): Promise<ResolvedAuth> => {
    try {
      // 1. Check user_roles (master / admin) — if query fails, skip gracefully
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesErr) {
        console.warn("[AuthContext] falha ao buscar roles (ignorando):", rolesErr.message);
      } else {
        if (roles?.some((r) => r.role === "master")) return { level: "master", redirect: "/master" };
        if (roles?.some((r) => r.role === "admin")) return { level: "admin", redirect: "/admin" };
      }

      // 2. Check store_members — if query fails, skip gracefully
      const { data: members, error: membersErr } = await supabase
        .from("store_members")
        .select("store_id, role_in_store, stores(id, name, slug)")
        .eq("user_id", user.id);

      if (membersErr) {
        console.warn("[AuthContext] falha ao buscar members (ignorando):", membersErr.message);
      } else if (members && members.length > 0) {
        const sortedMembers = [...members].sort(
          (a, b) => (STORE_ROLE_PRIORITY[b.role_in_store] ?? 0) - (STORE_ROLE_PRIORITY[a.role_in_store] ?? 0)
        );

        const m = sortedMembers[0];
        const store = m.stores as any;
        const role = m.role_in_store;

        if (role === "owner" || role === "admin") return { level: "admin", redirect: "/admin" };

        const moduleRouteMap: Record<string, string> = { tv_retirada: "tv", cliente: "tablet" };
        const opSession: OperationalSession = {
          storeId: store.id,
          storeSlug: store.slug,
          storeName: store.name,
          module: role,
          pinLabel: user.email ?? null,
        };

        let route = moduleRouteMap[role] ?? role;
        if (role === "garcom") {
          const { data: cfg } = await supabase
            .from("restaurant_config")
            .select("modulos")
            .eq("store_id", store.id)
            .maybeSingle();
          const modulos = (cfg?.modulos as Record<string, boolean>) ?? {};
          if (modulos.mesas === false) route = "garcom-pdv";
        }

        return {
          level: "operational",
          opSession,
          redirect: `/${route}`,
        };
      }

      return { level: "unauthenticated" };
    } catch (err) {
      console.error("[AuthContext] erro em resolveSupabaseLevel:", err);
      return { level: "unauthenticated" };
    }
  }, []);

  /* ─── Apply resolved auth ─── */
  const applyResolved = useCallback((resolved: ResolvedAuth) => {
    setAuthLevel(resolved.level);
    if (resolved.opSession) {
      setOperationalSession(resolved.opSession);
      writeOpSession(resolved.opSession);
    } else if (resolved.level !== "unauthenticated") {
      setOperationalSession(null);
      writeOpSession(null);
    }
  }, []);

  /* ─── Listen to auth state changes ─── */
  useEffect(() => {
    let initialResolved = false;

    // 1. Restore session from storage FIRST
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const resolved = await resolveSupabaseLevel(session.user);
        applyResolved(resolved);
        initialResolved = true;
      } else {
        const opSession = readOpSession();
        if (opSession) {
          setAuthLevel("operational");
          setOperationalSession(opSession);
        }
      }
      setIsLoading(false);
    });

    // 2. Subscribe to subsequent changes — skip INITIAL_SESSION to avoid double resolve
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return; // already handled above
      if (session?.user) {
        setSupabaseUser(session.user);
        resolveSupabaseLevel(session.user).then(applyResolved);
      } else {
        setSupabaseUser(null);
        const opSession = readOpSession();
        setAuthLevel(opSession ? "operational" : "unauthenticated");
        setOperationalSession(opSession);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resolveSupabaseLevel, applyResolved]);

  /* ─── Unified login (new) ─── */
  const loginUnified = useCallback(async (email: string, password: string): Promise<LoginUnifiedResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        return { ok: false, error: error?.message || "Credenciais inválidas" };
      }

      // Timeout protection: if resolveSupabaseLevel hangs, don't block forever
      const resolvePromise = resolveSupabaseLevel(data.user);
      const timeoutPromise = new Promise<ResolvedAuth>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 12000)
      );

      let resolved: ResolvedAuth;
      try {
        resolved = await Promise.race([resolvePromise, timeoutPromise]);
      } catch (err) {
        console.warn("[AuthContext] resolveSupabaseLevel timeout/error, tratando como admin fallback:", err);
        // If resolution timed out but auth succeeded, assume admin level as safe fallback
        resolved = { level: "admin", redirect: "/admin" };
      }

      if (resolved.level === "unauthenticated") {
        await supabase.auth.signOut();
        return { ok: false, error: "Usuário sem permissão de acesso ao sistema" };
      }

      setSupabaseUser(data.user);
      applyResolved(resolved);
      return { ok: true, redirect: resolved.redirect };
    } catch (err: any) {
      console.error("[AuthContext] loginUnified error:", err);
      return { ok: false, error: err?.message || "Erro ao fazer login" };
    }
  }, [resolveSupabaseLevel, applyResolved]);

  /* ─── Level 1: Master login (legacy) ─── */
  const loginAsMaster = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Falha ao autenticar" };
    }

    const resolved = await resolveSupabaseLevel(data.user);
    if (resolved.level !== "master") {
      await supabase.auth.signOut();
      return { ok: false, error: "Este usuário não possui permissão de Master" };
    }

    setSupabaseUser(data.user);
    applyResolved(resolved);
    return { ok: true };
  }, [resolveSupabaseLevel, applyResolved]);

  /* ─── Level 2: Admin login (legacy) ─── */
  const loginAsAdmin = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Falha ao autenticar" };
    }

    const resolved = await resolveSupabaseLevel(data.user);
    if (resolved.level !== "admin" && resolved.level !== "master") {
      await supabase.auth.signOut();
      return { ok: false, error: "Este usuário não possui permissão de Admin" };
    }

    setSupabaseUser(data.user);
    applyResolved(resolved);
    return { ok: true };
  }, [resolveSupabaseLevel, applyResolved]);

  /* ─── Level 3: Operational PIN login ─── */
  const loginAsOperational = useCallback(async (storeSlug: string, module: string, pin: string): Promise<LoginResult> => {
    // 1. Find store by slug
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug")
      .eq("slug", storeSlug)
      .maybeSingle();

    if (storeError || !store) {
      return { ok: false, error: "Loja não encontrada" };
    }

    // 2. Fetch active PINs for this store+module
    const { data: pins, error: pinsError } = await supabase
      .from("module_pins")
      .select("pin_hash, label")
      .eq("store_id", store.id)
      .eq("module", module)
      .eq("active", true);

    if (pinsError || !pins || pins.length === 0) {
      return { ok: false, error: "Nenhum PIN ativo para este módulo" };
    }

    // 3. Verify PIN against each hash using the RPC
    let matchedLabel: string | null = null;
    let found = false;

    for (const p of pins) {
      const { data: isValid } = await supabase.rpc("verify_pin", {
        input_pin: pin,
        stored_hash: p.pin_hash,
      });

      if (isValid) {
        found = true;
        matchedLabel = p.label;
        break;
      }
    }

    if (!found) {
      return { ok: false, error: "PIN inválido" };
    }

    // 4. Save operational session
    const opSession: OperationalSession = {
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      module,
      pinLabel: matchedLabel,
    };

    setOperationalSession(opSession);
    writeOpSession(opSession);
    setAuthLevel("operational");
    return { ok: true };
  }, []);

  /* ─── Level 3b: Login by PIN only (auto-detect module) ─── */
  const loginByPin = useCallback(async (storeSlug: string, pin: string): Promise<LoginResult & { module?: string }> => {
    // 1. Find store by slug (using SECURITY DEFINER RPC to bypass RLS)
    const { data: storeRows, error: storeError } = await supabase
      .rpc("get_store_by_slug", { _slug: storeSlug });

    const store = storeRows?.[0];
    if (storeError || !store) {
      return { ok: false, error: "Loja não encontrada" };
    }

    // 2. Fetch ALL active PINs for this store (any module)
    const { data: pins, error: pinsError } = await supabase
      .from("module_pins")
      .select("pin_hash, label, module")
      .eq("store_id", store.id)
      .eq("active", true);

    if (pinsError || !pins || pins.length === 0) {
      return { ok: false, error: "Nenhum PIN ativo nesta loja" };
    }

    // 3. Verify PIN against each hash
    for (const p of pins) {
      const { data: isValid } = await supabase.rpc("verify_pin", {
        input_pin: pin,
        stored_hash: p.pin_hash,
      });

      if (isValid) {
        const opSession: OperationalSession = {
          storeId: store.id,
          storeSlug: store.slug,
          storeName: store.name,
          module: p.module,
          pinLabel: p.label,
        };
        setOperationalSession(opSession);
        writeOpSession(opSession);
        setAuthLevel("operational");
        return { ok: true, module: p.module };
      }
    }

    return { ok: false, error: "PIN inválido" };
  }, []);

  /* ─── Universal logout ─── */
  const logout = useCallback(async (_role?: UserRole) => {
    if (supabaseUser) {
      await supabase.auth.signOut();
    }
    setSupabaseUser(null);
    setOperationalSession(null);
    writeOpSession(null);
    setAuthLevel("unauthenticated");
  }, [supabaseUser]);

  /* ─── Legacy stubs ─── */
  const loginWithPin = useCallback(async () => ({ ok: false as const, error: LEGACY_ERROR }), []);
  const verifyManagerAccess = useCallback(async (_nome: string, pin: string): Promise<{ ok: boolean; error?: string; user?: OperationalUser }> => {
    const storeId = operationalSession?.storeId ?? null;
    try {
      let query = supabase
        .from("module_pins")
        .select("pin_hash, label, module")
        .in("module", ["gerente", "administrador"])
        .eq("active", true);
      if (storeId) query = query.eq("store_id", storeId);
      const { data: pins } = await query;
      if (!pins || pins.length === 0) {
        return { ok: false, error: "Nenhum PIN de gerente ativo encontrado" };
      }
      for (const p of pins) {
        const { data: isValid } = await supabase.rpc("verify_pin", {
          input_pin: pin,
          stored_hash: p.pin_hash,
        });
        if (isValid) {
          return {
            ok: true,
            user: { id: "mgr-op", nome: p.label ?? "Gerente", role: "gerente" as UserRole, criadoEm: "" },
          };
        }
      }
      return { ok: false, error: "PIN de gerente inválido" };
    } catch (err) {
      console.error("[AuthContext] erro:", err);
      return { ok: false, error: "Erro ao verificar PIN" };
    }
  }, [operationalSession]);

  const verifyEmployeeAccess = useCallback(async (_nome: string, pin: string): Promise<{ ok: boolean; error?: string; user?: OperationalUser }> => {
    const storeId = operationalSession?.storeId ?? null;
    try {
      let query = supabase
        .from("module_pins")
        .select("pin_hash, label, module, store_id, stores(id, name, slug)")
        .eq("active", true);
      if (storeId) query = query.eq("store_id", storeId);
      const { data: pins } = await query;
      if (!pins || pins.length === 0) {
        return { ok: false, error: "Nenhum PIN ativo encontrado" };
      }
      for (const p of pins) {
        const { data: isValid } = await supabase.rpc("verify_pin", {
          input_pin: pin,
          stored_hash: p.pin_hash,
        });
        if (isValid) {
          const store = p.stores as { id: string; name: string; slug: string } | null;
          if (store?.id && store.slug && store.name) {
            const opSession: OperationalSession = {
              storeId: store.id,
              storeSlug: store.slug,
              storeName: store.name,
              module: p.module,
              pinLabel: p.label,
            };
            setOperationalSession(opSession);
            writeOpSession(opSession);
            setAuthLevel("operational");
          }
          return {
            ok: true,
            user: { id: "emp-op", nome: p.label ?? "Operador", role: (p.module as UserRole) ?? "caixa", criadoEm: "" },
          };
        }
      }
      return { ok: false, error: "PIN inválido" };
    } catch (err) {
      console.error("[AuthContext] erro:", err);
      return { ok: false, error: "Erro ao verificar PIN" };
    }
  }, [operationalSession]);
  const createUser = useCallback(() => ({ ok: false as const, error: LEGACY_ERROR }), []);
  const removeUser = useCallback(() => ({ ok: false as const, error: LEGACY_ERROR }), []);
  const deactivateUser = useCallback(() => ({ ok: false as const, error: LEGACY_ERROR }), []);
  const activateUser = useCallback(() => ({ ok: false as const, error: LEGACY_ERROR }), []);
  const getProfilesByRole = useCallback(() => [] as OperationalUser[], []);
  const getActiveProfilesByRole = useCallback(() => [] as OperationalUser[], []);
  const logout_role = useCallback(() => {}, []);

  const value = useMemo<AuthContextType>(() => ({
    authLevel,
    supabaseUser,
    isLoading,
    loginUnified,
    loginAsMaster,
    loginAsAdmin,
    loginAsOperational,
    loginByPin,
    operationalSession,
    logout,
    // Legacy stubs — derive from operational session
    currentGarcom: operationalSession?.module === "garcom" ? { id: "op", nome: operationalSession.pinLabel ?? "Garçom", role: "garcom" as UserRole, criadoEm: "" } : null,
    currentCaixa: operationalSession?.module === "caixa" ? { id: "op", nome: operationalSession.pinLabel ?? "Caixa", role: "caixa" as UserRole, criadoEm: "" } : null,
    currentGerente: operationalSession?.module === "gerente" ? { id: "op", nome: operationalSession.pinLabel ?? "Gerente", role: "gerente" as UserRole, criadoEm: "" } : null,
    getProfilesByRole,
    getActiveProfilesByRole,
    loginWithPin,
    createUser,
    removeUser,
    deactivateUser,
    activateUser,
    verifyManagerAccess,
    verifyEmployeeAccess,
    logout_role,
  }), [
    authLevel, supabaseUser, isLoading, operationalSession,
    loginUnified, loginAsMaster, loginAsAdmin, loginAsOperational, loginByPin, logout,
    getProfilesByRole, getActiveProfilesByRole, loginWithPin,
    createUser, removeUser, deactivateUser, activateUser,
    verifyManagerAccess, verifyEmployeeAccess, logout_role,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
