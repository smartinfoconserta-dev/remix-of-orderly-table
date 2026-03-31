import { useEffect, useMemo, useState } from "react";
import { getSistemaConfig } from "@/lib/adminStorage";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { getActiveStoreId } from "@/lib/sessionManager";

interface ModuleGateProps {
  moduleKey: "mesas" | "balcao" | "totem" | "delivery" | "motoboy" | "garcomPdv";
  moduleName: string;
  children: React.ReactNode;
}

const ModuleGate = ({ moduleKey, moduleName, children }: ModuleGateProps) => {
  const { authLevel, operationalSession } = useAuth();
  const { storeId: ctxStoreId } = useStore();
  const isAdmin = authLevel === "admin" || authLevel === "master";

  const [dbConfig, setDbConfig] = useState<{ deliveryAtivo?: boolean; modulos?: Record<string, boolean> } | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveStoreId = operationalSession?.storeId ?? ctxStoreId ?? getActiveStoreId();

  // Fetch config from DB if localStorage is empty for delivery/motoboy checks
  useEffect(() => {
    if (isAdmin) return;
    const localConfig = getSistemaConfig();
    // If deliveryAtivo is already defined in local config, no need to fetch
    if (localConfig.deliveryAtivo !== undefined) return;
    if (!effectiveStoreId) return;

    setLoading(true);
    supabase
      .from("restaurant_config")
      .select("delivery_ativo, modulos")
      .eq("store_id", effectiveStoreId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDbConfig({
            deliveryAtivo: data.delivery_ativo ?? true,
            modulos: (data.modulos as Record<string, boolean>) ?? {},
          });
        }
        setLoading(false);
      });
  }, [effectiveStoreId, isAdmin]);

  const isActive = useMemo(() => {
    const localConfig = getSistemaConfig();
    const modulos = localConfig?.modulos ?? dbConfig?.modulos ?? {};

    // Mesas defaults to true (backward compat)
    if (moduleKey === "mesas") return modulos.mesas !== false;

    // Delivery e motoboy são controlados pelo toggle deliveryAtivo
    if (moduleKey === "delivery" || moduleKey === "motoboy") {
      const deliveryAtivo = localConfig.deliveryAtivo ?? dbConfig?.deliveryAtivo;
      return deliveryAtivo === true || (modulos as any).delivery === true;
    }

    return (modulos as any)[moduleKey] === true;
  }, [moduleKey, dbConfig]);

  // Admin/master always have access
  if (isAdmin) return <>{children}</>;

  // Show loading while fetching from DB
  if (loading) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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
