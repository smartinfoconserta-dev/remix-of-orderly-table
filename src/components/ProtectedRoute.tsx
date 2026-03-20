import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

const ROLE_LEVEL: Record<string, number> = {
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

  // Ninguém logado → mostra formulário de login
  if (activeUsers.length === 0) return <>{children}</>;

  // Admin seed → bypass total
  if (activeUsers.some((u) => u!.id === "seed-admin-001")) return <>{children}</>;

  // Maior nível entre sessões ativas
  const maxLevel = Math.max(...activeUsers.map((u) => ROLE_LEVEL[u!.role] ?? 0));
  const requiredLevel = ROLE_LEVEL[requiredSession] ?? 0;

  if (maxLevel >= requiredLevel) return <>{children}</>;

  // Sessão ativa com nível insuficiente → redireciona
  return <Navigate to="/" replace />;
};
