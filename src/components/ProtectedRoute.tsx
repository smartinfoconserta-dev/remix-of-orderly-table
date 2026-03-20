import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

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

  // Se tem sessão no slot requerido → acesso OK
  if (sessionMap[requiredSession]) return <>{children}</>;

  // Se NÃO tem nenhuma sessão → mostra login da página
  const hasAnySession = !!(currentGarcom || currentCaixa || currentGerente);
  if (!hasAnySession) return <>{children}</>;

  // Tem sessão em outro slot → bloqueia
  return <Navigate to="/" replace />;
};
