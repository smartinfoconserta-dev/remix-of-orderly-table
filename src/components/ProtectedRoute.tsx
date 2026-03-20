import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

// Quais ROLES concedem acesso a cada rota
const ROUTE_ALLOWED_ROLES: Record<UserRole, UserRole[]> = {
  garcom: ["garcom", "caixa", "gerente"],
  caixa: ["caixa", "gerente"],
  gerente: ["gerente"],
};

// Hierarquia: quais roles são INFERIORES (não podem acessar rotas acima)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  garcom: 1,
  caixa: 2,
  gerente: 3,
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  const { currentGarcom, currentCaixa, currentGerente } = useAuth();

  const activeUsers = [currentGarcom, currentCaixa, currentGerente].filter(Boolean);

  // Sem nenhuma sessão ativa → mostra formulário de login da página
  if (activeUsers.length === 0) return <>{children}</>;

  const allowedRoles = ROUTE_ALLOWED_ROLES[requiredSession] ?? [requiredSession];

  // Seed admin bypass total
  if (activeUsers.some((u) => u!.id === "seed-admin-001")) return <>{children}</>;

  // Algum usuário ativo tem role permitido para esta rota → OK
  if (activeUsers.some((u) => allowedRoles.includes(u!.role as UserRole))) return <>{children}</>;

  // Usuário ativo tem role INFERIOR → bloqueia (ex: garçom tentando /caixa)
  // Usuário ativo tem role SUPERIOR mas rota não permite → mostra login
  // Na prática: se o nível máximo das sessões é menor que o requerido → bloqueia
  const maxActiveLevel = Math.max(...activeUsers.map((u) => ROLE_HIERARCHY[u!.role as UserRole] ?? 0));
  const requiredLevel = ROLE_HIERARCHY[requiredSession] ?? 0;

  if (maxActiveLevel < requiredLevel) {
    // Sessão inferior tentando acessar rota superior → bloqueia
    return <Navigate to="/" replace />;
  }

  // Caso edge: mostra a página (formulário de login)
  return <>{children}</>;
};
