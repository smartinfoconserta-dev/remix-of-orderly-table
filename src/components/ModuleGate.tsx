import { useMemo } from "react";
import { getSistemaConfig } from "@/lib/adminStorage";
import { useAuth } from "@/contexts/AuthContext";

interface ModuleGateProps {
  moduleKey: "mesas" | "balcao" | "totem" | "delivery" | "motoboy";
  moduleName: string;
  children: React.ReactNode;
}

const ModuleGate = ({ moduleKey, moduleName, children }: ModuleGateProps) => {
  const { authLevel } = useAuth();
  const isAdmin = authLevel === "admin" || authLevel === "master";

  const isActive = useMemo(() => {
    const config = getSistemaConfig();
    const modulos = config?.modulos ?? {};
    // Mesas defaults to true (backward compat)
    if (moduleKey === "mesas") return modulos.mesas !== false;
    // Motoboy follows delivery
    if (moduleKey === "motoboy") return modulos.delivery !== false;
    return (modulos as any)[moduleKey] === true;
  }, [moduleKey]);

  // Admin/master always have access
  if (isAdmin) return <>{children}</>;

  if (!isActive) {
    return (
      <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6 gap-4">
        <span className="text-5xl opacity-30">🔒</span>
        <p className="text-lg font-bold text-foreground">Módulo desativado</p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          O módulo "{moduleName}" está desativado neste estabelecimento.
          Fale com o administrador para ativar.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ModuleGate;
