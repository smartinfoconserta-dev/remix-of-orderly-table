import type { UserRole } from "@/types/operations";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

/**
 * Guard de rota pass-through.
 * A segurança real é feita por loginWithPin (bloqueia role errado),
 * sanitizeSessions (limpa sessões stale) e getCurrentUser (valida role ao ler).
 * Este componente existe para futura expansão (ex: redirect após logout forçado).
 */
export const ProtectedRoute = ({ children, requiredSession: _requiredSession }: ProtectedRouteProps) => {
  return <>{children}</>;
};
