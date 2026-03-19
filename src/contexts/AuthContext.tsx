import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { OperationalUser, UserRole } from "@/types/operations";

interface StoredUser extends OperationalUser {
  pinHash: string;
}

interface StoredSession {
  userId: string;
  loggedInAt: string;
}

interface AuthState {
  users: StoredUser[];
  sessions: Partial<Record<UserRole, StoredSession>>;
}

interface LoginResult {
  ok: boolean;
  error?: string;
  user?: OperationalUser;
}

interface AuthContextType {
  currentGarcom: OperationalUser | null;
  currentCaixa: OperationalUser | null;
  currentGerente: OperationalUser | null;
  getProfilesByRole: (role: UserRole) => OperationalUser[];
  loginWithPin: (role: UserRole, nome: string, pin: string) => Promise<LoginResult>;
  verifyManagerAccess: (nome: string, pin: string) => Promise<LoginResult>;
  verifyEmployeeAccess: (nome: string, pin: string) => Promise<LoginResult>;
  logout: (role: UserRole) => void;
}

const AUTH_STORAGE_KEY = "obsidian-auth-v1";

const loginSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres")
    .max(40, "Use no máximo 40 caracteres")
    .regex(/^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u, "Use apenas letras, números e separadores simples"),
  pin: z.string().regex(/^\d{4,6}$/, "O PIN deve ter entre 4 e 6 números"),
});

const emptyState: AuthState = {
  users: [],
  sessions: {},
};

const authContextStore = globalThis as typeof globalThis & {
  __obsidianAuthContext__?: React.Context<AuthContextType | null>;
};

const AuthContext = authContextStore.__obsidianAuthContext__ ?? createContext<AuthContextType | null>(null);
authContextStore.__obsidianAuthContext__ = AuthContext;

const hashPin = (pin: string) => btoa(`pin:${pin}`).split("").reverse().join("");

const toPublicUser = ({ pinHash: _pinHash, ...user }: StoredUser): OperationalUser => user;

const readAuthState = (): AuthState => {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return emptyState;

    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: parsed.sessions ?? {},
    };
  } catch {
    return emptyState;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(readAuthState);

  useEffect(() => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getCurrentUser = useCallback(
    (role: UserRole): OperationalUser | null => {
      const session = state.sessions[role];
      if (!session) return null;

      const user = state.users.find((item) => item.id === session.userId && item.role === role);
      return user ? toPublicUser(user) : null;
    },
    [state.sessions, state.users],
  );

  const currentGarcom = useMemo(() => getCurrentUser("garcom"), [getCurrentUser]);
  const currentCaixa = useMemo(() => getCurrentUser("caixa"), [getCurrentUser]);
  const currentGerente = useMemo(() => getCurrentUser("gerente"), [getCurrentUser]);

  const getProfilesByRole = useCallback(
    (role: UserRole) => state.users.filter((user) => user.role === role).map(toPublicUser),
    [state.users],
  );

  const loginWithPin = useCallback(async (role: UserRole, nome: string, pin: string): Promise<LoginResult> => {
    const parsed = loginSchema.safeParse({ nome, pin });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados informados" };
    }

    const nomeNormalizado = parsed.data.nome.trim();
    const pinHash = hashPin(parsed.data.pin);
    let authenticatedUser: OperationalUser | null = null;
    let error: string | undefined;

    setState((prev) => {
      const existingUser = prev.users.find(
        (user) => user.role === role && user.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
      );

      if (existingUser && existingUser.pinHash !== pinHash) {
        error = "PIN inválido para este usuário";
        return prev;
      }

      const storedUser = existingUser ?? {
        id: `user-${role}-${Date.now()}`,
        nome: nomeNormalizado,
        role,
        criadoEm: new Date().toISOString(),
        pinHash,
      };

      authenticatedUser = toPublicUser(storedUser);

      return {
        users: existingUser ? prev.users : [storedUser, ...prev.users],
        sessions: {
          ...prev.sessions,
          [role]: {
            userId: storedUser.id,
            loggedInAt: new Date().toISOString(),
          },
        },
      };
    });

    if (error) {
      return { ok: false, error };
    }

    return { ok: true, user: authenticatedUser ?? undefined };
  }, []);

  const verifyManagerAccess = useCallback(async (nome: string, pin: string): Promise<LoginResult> => {
    const parsed = loginSchema.safeParse({ nome, pin });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados informados" };
    }

    const nomeNormalizado = parsed.data.nome.trim();
    const gerente = state.users.find(
      (user) => user.role === "gerente" && user.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
    );

    if (!gerente) {
      return { ok: false, error: "Gerente não encontrado" };
    }

    if (gerente.pinHash !== hashPin(parsed.data.pin)) {
      return { ok: false, error: "PIN do gerente inválido" };
    }

    return { ok: true, user: toPublicUser(gerente) };
  }, [state.users]);

  const logout = useCallback((role: UserRole) => {
    setState((prev) => {
      const sessions = { ...prev.sessions };
      delete sessions[role];
      return { ...prev, sessions };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentGarcom,
        currentCaixa,
        currentGerente,
        getProfilesByRole,
        loginWithPin,
        verifyManagerAccess,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
