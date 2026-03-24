import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { OperationalUser, UserRole } from "@/types/operations";

interface StoredUser extends OperationalUser {
  pinHash: string;
  ativo: boolean;
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
  getActiveProfilesByRole: (role: UserRole) => OperationalUser[];
  loginWithPin: (role: UserRole, nome: string, pin: string) => Promise<LoginResult>;
  createUser: (role: UserRole, nome: string, pin: string) => { ok: boolean; error?: string; user?: OperationalUser };
  removeUser: (id: string) => { ok: boolean; error?: string };
  deactivateUser: (id: string) => { ok: boolean; error?: string };
  activateUser: (id: string) => { ok: boolean; error?: string };
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

const seedAdmin: StoredUser = {
  id: "seed-admin-001",
  role: "gerente",
  nome: "admin",
  pinHash: btoa("pin:1234").split("").reverse().join(""),
  ativo: true,
  criadoEm: new Date().toISOString(),
};

const emptyState: AuthState = {
  users: [seedAdmin],
  sessions: {},
};

const authContextStore = globalThis as typeof globalThis & {
  __obsidianAuthContext__?: React.Context<AuthContextType | null>;
};

const AuthContext = authContextStore.__obsidianAuthContext__ ?? createContext<AuthContextType | null>(null);
authContextStore.__obsidianAuthContext__ = AuthContext;

const hashPin = (pin: string) => btoa(`pin:${pin}`).split("").reverse().join("");

const toPublicUser = ({ pinHash: _pinHash, ativo: _ativo, ...user }: StoredUser): OperationalUser => user;

const ensureAtivoField = (users: StoredUser[]): StoredUser[] =>
  users.map((u) => ({ ...u, ativo: u.ativo !== false }));

const SESSION_ALLOWED_ROLES: Record<UserRole, UserRole[]> = {
  garcom: ["garcom", "caixa", "gerente"],
  caixa: ["caixa", "gerente"],
  delivery: ["delivery", "caixa", "gerente"],
  gerente: ["gerente"],
};

const sanitizeSessions = (
  users: StoredUser[],
  sessions: Partial<Record<UserRole, StoredSession>>,
): Partial<Record<UserRole, StoredSession>> => {
  const next: Partial<Record<UserRole, StoredSession>> = {};

  (Object.entries(sessions) as [UserRole, StoredSession | undefined][]).forEach(([sessionRole, session]) => {
    if (!session) return;

    const user = users.find((item) => item.id === session.userId);
    if (!user) return;
    if (user.id === "seed-admin-001") {
      next[sessionRole] = session;
      return;
    }

    const allowed = SESSION_ALLOWED_ROLES[sessionRole] ?? [sessionRole];
    if (allowed.includes(user.role)) {
      next[sessionRole] = session;
    }
  });

  return next;
};

const readAuthState = (): AuthState => {
  if (typeof window === "undefined") return emptyState;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      const initial = { users: [seedAdmin], sessions: {} };
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw) as Partial<AuthState>;
    let users = ensureAtivoField(Array.isArray(parsed.users) ? parsed.users : []);
    users = users.map((u) => (u.role as string) === "admin" ? { ...u, role: "gerente" as UserRole } : u);

    const hasSeedAdmin = users.some(
      (u) => u.role === "gerente" && u.nome.toLocaleLowerCase("pt-BR") === "admin",
    );
    if (!hasSeedAdmin) {
      users = [seedAdmin, ...users];
    }

    const sessions = sanitizeSessions(users, parsed.sessions ?? {});
    const patched = { users, sessions };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(patched));
    return patched;
  } catch {
    return emptyState;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(readAuthState);

  useEffect(() => {
    const sanitizedSessions = sanitizeSessions(state.users, state.sessions);
    if (JSON.stringify(sanitizedSessions) !== JSON.stringify(state.sessions)) {
      setState((prev) => ({ ...prev, sessions: sanitizedSessions }));
    }
  }, [state.sessions, state.users]);

  useEffect(() => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const getCurrentUser = useCallback(
    (role: UserRole): OperationalUser | null => {
      const session = state.sessions[role];
      if (!session) return null;

      const user = state.users.find((item) => item.id === session.userId);
      if (!user) return null;
      if (user.id === "seed-admin-001") return toPublicUser(user);

      const allowed = SESSION_ALLOWED_ROLES[role] ?? [role];
      if (!allowed.includes(user.role)) return null;

      return toPublicUser(user);
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

  const getActiveProfilesByRole = useCallback(
    (role: UserRole) => state.users.filter((user) => user.role === role && user.ativo !== false).map(toPublicUser),
    [state.users],
  );

  const createUser = useCallback((role: UserRole, nome: string, pin: string): { ok: boolean; error?: string; user?: OperationalUser } => {
    const parsed = loginSchema.safeParse({ nome, pin });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados informados" };
    }

    const nomeNormalizado = parsed.data.nome.trim();
    const pinHash = hashPin(parsed.data.pin);

    const existing = state.users.find(
      (u) => u.role === role && u.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
    );

    if (existing) {
      return { ok: false, error: "Já existe um usuário com este nome neste perfil" };
    }

    const newUser: StoredUser = {
      id: `user-${role}-${Date.now()}`,
      nome: nomeNormalizado,
      role,
      criadoEm: new Date().toISOString(),
      pinHash,
      ativo: true,
    };

    setState((prev) => ({
      ...prev,
      users: [newUser, ...prev.users],
    }));

    return { ok: true, user: toPublicUser(newUser) };
  }, [state.users]);

  const removeUser = useCallback((id: string): { ok: boolean; error?: string } => {
    const user = state.users.find((u) => u.id === id);
    if (!user) return { ok: false, error: "Usuário não encontrado" };
    if (id.startsWith("seed-")) return { ok: false, error: "Não é possível remover usuários padrão" };

    setState((prev) => ({
      users: prev.users.filter((u) => u.id !== id),
      sessions: prev.sessions,
    }));
    return { ok: true };
  }, [state.users]);

  const deactivateUser = useCallback((id: string): { ok: boolean; error?: string } => {
    const user = state.users.find((u) => u.id === id);
    if (!user) return { ok: false, error: "Usuário não encontrado" };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => u.id === id ? { ...u, ativo: false } : u),
    }));
    return { ok: true };
  }, [state.users]);

  const activateUser = useCallback((id: string): { ok: boolean; error?: string } => {
    const user = state.users.find((u) => u.id === id);
    if (!user) return { ok: false, error: "Usuário não encontrado" };

    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => u.id === id ? { ...u, ativo: true } : u),
    }));
    return { ok: true };
  }, [state.users]);

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
      // Roles allowed per target route
      const allowedRoles: Record<UserRole, UserRole[]> = {
        garcom: ["garcom", "caixa", "gerente"],
        caixa: ["caixa", "gerente"],
        delivery: ["delivery", "caixa", "gerente"],
        gerente: ["gerente"],
      };
      const allowed = allowedRoles[role] ?? [role];

      // First: try to find user by name across ALL roles
      const anyUser = prev.users.find(
        (user) => user.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
      );

      // Seed admin (nome="admin", role="gerente") can access ANY route
      const isSeedAdmin = anyUser && anyUser.id === "seed-admin-001";

      // Find user matching allowed roles for this route
      const existingUser = isSeedAdmin
        ? anyUser
        : prev.users.find(
            (user) => allowed.includes(user.role) && user.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
          );

      if (existingUser && existingUser.ativo === false) {
        error = "Este usuário está desativado. Contacte o gerente.";
        return prev;
      }

      if (existingUser && existingUser.pinHash !== pinHash) {
        error = "PIN inválido para este usuário";
        return prev;
      }

      if (!existingUser) {
        // User exists but with wrong role
        if (anyUser) {
          error = "Acesso negado. Seu perfil não tem permissão para esta área.";
          return prev;
        }

        // Auto-register only for garçom
        if (role === "garcom") {
          const storedUser: StoredUser = {
            id: `user-${role}-${Date.now()}`,
            nome: nomeNormalizado,
            role,
            criadoEm: new Date().toISOString(),
            pinHash,
            ativo: true,
          };
          authenticatedUser = toPublicUser(storedUser);
          return {
            users: [storedUser, ...prev.users],
            sessions: {
              ...prev.sessions,
              [role]: { userId: storedUser.id, loggedInAt: new Date().toISOString() },
            },
          };
        }
        error = role === "caixa"
          ? "Usuário não encontrado. Solicite cadastro ao gerente."
          : "Usuário não encontrado. Solicite cadastro ao admin.";
        return prev;
      }

      authenticatedUser = toPublicUser(existingUser);

      return {
        users: prev.users,
        sessions: {
          ...prev.sessions,
          [role]: { userId: existingUser.id, loggedInAt: new Date().toISOString() },
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
    const user = state.users.find(
      (u) => u.role === "gerente" && u.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
    );

    if (!user) {
      return { ok: false, error: "Gerente não encontrado" };
    }

    if (user.ativo === false) {
      return { ok: false, error: "Este gerente está desativado" };
    }

    if (user.pinHash !== hashPin(parsed.data.pin)) {
      return { ok: false, error: "PIN do gerente inválido" };
    }

    return { ok: true, user: toPublicUser(user) };
  }, [state.users]);

  const verifyEmployeeAccess = useCallback(async (nome: string, pin: string): Promise<LoginResult> => {
    const parsed = loginSchema.safeParse({ nome, pin });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Revise os dados informados" };
    }

    const nomeNormalizado = parsed.data.nome.trim();
    const pinHashed = hashPin(parsed.data.pin);
    const employee = state.users.find(
      (user) => user.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado.toLocaleLowerCase("pt-BR"),
    );

    if (!employee) {
      return { ok: false, error: "Funcionário não encontrado" };
    }

    if (employee.ativo === false) {
      return { ok: false, error: "Este funcionário está desativado. Contacte o gerente." };
    }

    if (employee.pinHash !== pinHashed) {
      return { ok: false, error: "PIN inválido" };
    }

    return { ok: true, user: toPublicUser(employee) };
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
        getActiveProfilesByRole,
        loginWithPin,
        createUser,
        removeUser,
        deactivateUser,
        activateUser,
        verifyManagerAccess,
        verifyEmployeeAccess,
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
