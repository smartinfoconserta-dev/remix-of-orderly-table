import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredLevel: "master" | "admin" | "operational";
  requiredModule?: string | string[];
}

export const ProtectedRoute = ({ children, requiredLevel, requiredModule }: ProtectedRouteProps) => {
  const { authLevel, operationalSession, isLoading } = useAuth();
  const location = useLocation();
  const loginFallbackState = {
    suppressAutoRedirect: true,
    intendedPath: location.pathname,
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (requiredLevel === "master" && authLevel !== "master") {
    return <Navigate to="/" replace state={loginFallbackState} />;
  }

  if (requiredLevel === "admin" && authLevel !== "admin" && authLevel !== "master") {
    return <Navigate to="/" replace state={loginFallbackState} />;
  }

  if (requiredLevel === "operational") {
    if (authLevel === "admin" || authLevel === "master") {
      // Admin/master têm acesso total a qualquer módulo operacional
    } else if (authLevel === "operational") {
      if (requiredModule) {
        const modules = Array.isArray(requiredModule) ? requiredModule : [requiredModule];
        if (!modules.includes(operationalSession?.module ?? "")) {
          return <Navigate to="/" replace />;
        }
      }
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
