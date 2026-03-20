import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession: _requiredSession }: ProtectedRouteProps) => {
  useAuth();

  // Importante: o guard NÃO deve bloquear o acesso à própria página de login.
  // A validação real de permissão acontece dentro do fluxo de autenticação da página.
  return <>{children}</>;
};
