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

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  /** Current authentication level */
  authLevel: AuthLevel;
  /** Supabase user (master/admin only) */
  supabaseUser: User | null;
  /** True while checking initial session */
  isLoading: boolean;

  /* ─── Level 1 & 2: Supabase Auth ─── */
  loginAsMaster: (email: string, password: string) => Promise<LoginResult>;
  loginAsAdmin: (email: string, password: string) => Promise<LoginResult>;

  /* ─── Level 3: Operational PIN ─── */
  loginAsOperational: (storeSlug: string, module: string, pin: string) => Promise<LoginResult>;
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
    return raw ? (JSON.parse(raw) as OperationalSession) : null;
  } catch {
    return null;
  }
};

const writeOpSession = (session: OperationalSession | null) => {
  if (session) {
    sessionStorage.setItem(OP_SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(OP_SESSION_KEY);
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
  const resolveSupabaseLevel = useCallback(async (user: User): Promise<AuthLevel> => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles?.some((r) => r.role === "master")) return "master";
    if (roles?.some((r) => r.role === "admin")) return "admin";
    return "unauthenticated";
  }, []);

  /* ─── Listen to auth state changes ─── */
  useEffect(() => {
    // 1. Restore session from storage FIRST
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const level = await resolveSupabaseLevel(session.user);
        setAuthLevel(level);
      } else {
        const opSession = readOpSession();
        if (opSession) {
          setAuthLevel("operational");
          setOperationalSession(opSession);
        }
      }
      setIsLoading(false);
    });

    // 2. Subscribe to subsequent changes — NEVER await inside this callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        // Fire-and-forget role resolution to avoid deadlock
        resolveSupabaseLevel(session.user).then((level) => {
          setAuthLevel(level);
          if (level !== "unauthenticated") {
            setOperationalSession(null);
            writeOpSession(null);
          }
        });
      } else {
        setSupabaseUser(null);
        const opSession = readOpSession();
        setAuthLevel(opSession ? "operational" : "unauthenticated");
        setOperationalSession(opSession);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resolveSupabaseLevel]);

  /* ─── Level 1: Master login ─── */
  const loginAsMaster = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Falha ao autenticar" };
    }

    const level = await resolveSupabaseLevel(data.user);
    if (level !== "master") {
      await supabase.auth.signOut();
      return { ok: false, error: "Este usuário não possui permissão de Master" };
    }

    setSupabaseUser(data.user);
    setAuthLevel("master");
    setOperationalSession(null);
    writeOpSession(null);
    return { ok: true };
  }, [resolveSupabaseLevel]);

  /* ─── Level 2: Admin login ─── */
  const loginAsAdmin = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Falha ao autenticar" };
    }

    const level = await resolveSupabaseLevel(data.user);
    if (level !== "admin" && level !== "master") {
      await supabase.auth.signOut();
      return { ok: false, error: "Este usuário não possui permissão de Admin" };
    }

    setSupabaseUser(data.user);
    setAuthLevel(level);
    setOperationalSession(null);
    writeOpSession(null);
    return { ok: true };
  }, [resolveSupabaseLevel]);

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
  const verifyManagerAccess = useCallback(async () => ({ ok: false as const, error: LEGACY_ERROR }), []);
  const verifyEmployeeAccess = useCallback(async () => ({ ok: false as const, error: LEGACY_ERROR }), []);
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
    loginAsMaster,
    loginAsAdmin,
    loginAsOperational,
    operationalSession,
    logout,
    // Legacy stubs
    currentGarcom: null,
    currentCaixa: null,
    currentGerente: null,
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
    loginAsMaster, loginAsAdmin, loginAsOperational, logout,
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
