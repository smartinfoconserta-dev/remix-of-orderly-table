import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

// Quais slots de sessão concedem acesso a cada rota
const ROUTE_GRANTED_BY: Record<UserRole, UserRole[]> = {
  garcom: ["garcom", "caixa", "gerente"],
  caixa: ["caixa", "gerente"],
  gerente: ["gerente"],
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  const { currentGarcom, currentCaixa, currentGerente } = useAuth();

  const sessionMap: Record<UserRole, unknown> = {
    garcom: currentGarcom,
    caixa: currentCaixa,
    gerente: currentGerente,
  };

  const grantedBy = ROUTE_GRANTED_BY[requiredSession] ?? [requiredSession];

  // Tem sessão em algum slot que dá acesso a esta rota → OK
  if (grantedBy.some((slot) => !!sessionMap[slot])) return <>{children}</>;

  // Sem nenhuma sessão → mostra formulário de login
  const hasAnySession = !!(currentGarcom || currentCaixa || currentGerente);
  if (!hasAnySession) return <>{children}</>;

  // Tem sessão, mas em slot sem acesso a esta rota → bloqueia
  return <Navigate to="/" replace />;
};
