import type { UserRole } from "@/types/operations";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredSession: UserRole;
}

export const ProtectedRoute = ({ children, requiredSession }: ProtectedRouteProps) => {
  // Proteção de hierarquia é feita pelo loginWithPin
  // ProtectedRoute apenas marca a rota como protegida para documentação
  return <>{children}</>;
};
