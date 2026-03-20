import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

/**
 * Guard de rota que bloqueia acesso quando há uma sessão ativa de role ERRADO.
 * Se não há sessão nenhuma, permite acesso (a página mostra seu próprio formulário de login).
 * Isso impede ex: caixa logado acessar /gerente via URL.
 */
export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  const { currentGarcom, currentCaixa, currentGerente } = useAuth();

  // Se já existe sessão para este slot, deixa passar (já validado pelo sanitizeSessions)
  const sessionMap: Record<UserRole, unknown> = {
    garcom: currentGarcom,
    caixa: currentCaixa,
    gerente: currentGerente,
  };

  if (sessionMap[requiredSession]) {
    return <>{children}</>;
  }

  // Sem sessão para este slot — permitir acesso para mostrar formulário de login da página
  // MAS se o usuário tem sessão em OUTRO slot e tenta acessar via URL, bloqueamos
  // Ex: logado como caixa, digita /gerente → redirect
  const hasAnySession = !!(currentGarcom || currentCaixa || currentGerente);

  if (hasAnySession) {
    // Tem sessão em outro slot mas não neste — bloqueia
    return <Navigate to="/" replace />;
  }

  // Sem sessão nenhuma — mostra página (com formulário de login)
  return <>{children}</>;
};
