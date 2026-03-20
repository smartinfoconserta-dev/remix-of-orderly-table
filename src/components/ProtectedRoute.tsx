import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/operations";

// Quais ROLES concedem acesso a cada rota
const ROUTE_ALLOWED_ROLES: Record<UserRole, UserRole[]> = {
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

  // Collect all active users across all session slots
  const activeUsers = [currentGarcom, currentCaixa, currentGerente].filter(Boolean);

  // No active session anywhere → show login form
  if (activeUsers.length === 0) return <>{children}</>;

  const allowedRoles = ROUTE_ALLOWED_ROLES[requiredSession] ?? [requiredSession];

  // Check if ANY active user has a role that grants access to this route
  // Seed admin (id="seed-admin-001") bypasses everything
  const hasAccess = activeUsers.some(
    (user) => user!.id === "seed-admin-001" || allowedRoles.includes(user!.role as UserRole),
  );

  if (hasAccess) return <>{children}</>;

  // Has session but wrong role → block
  return <Navigate to="/" replace />;
};
