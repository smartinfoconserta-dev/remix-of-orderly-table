import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredLevel: "master" | "admin" | "operational";
  requiredModule?: string;
}

export const ProtectedRoute = ({ children, requiredLevel, requiredModule }: ProtectedRouteProps) => {
  const { authLevel, operationalSession, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (requiredLevel === "master" && authLevel !== "master") {
    return <Navigate to="/" replace />;
  }

  if (requiredLevel === "admin" && authLevel !== "admin" && authLevel !== "master") {
    return <Navigate to="/" replace />;
  }

  if (requiredLevel === "operational") {
    if (authLevel !== "operational") {
      return <Navigate to="/" replace />;
    }
    if (requiredModule && operationalSession?.module !== requiredModule) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
