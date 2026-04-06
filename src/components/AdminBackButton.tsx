import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Floating button shown only when an admin/master is viewing an operational page.
 * Hidden on admin/master/gerente panels and login.
 */
export const AdminBackButton = () => {
  const { authLevel } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (authLevel !== "admin" && authLevel !== "master") return null;

  const hiddenRoutes = ["/admin", "/master", "/gerente", "/garcom", "/garcom-pdv", "/"];
  if (hiddenRoutes.some((r) => pathname === r || (r !== "/" && pathname.startsWith(r + "/")))) return null;

  return (
    <button
      onClick={() => navigate(authLevel === "master" ? "/master" : "/admin")}
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      title="Voltar ao painel"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao Painel
    </button>
  );
};
