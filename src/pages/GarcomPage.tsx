import { useState, useEffect } from "react";
import { LogOut, Bell, TabletSmartphone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams, useNavigate } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";

import LicenseBanner from "@/components/LicenseBanner";
import OfflineIndicator from "@/components/OfflineIndicator";
import ModuleGate from "@/components/ModuleGate";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import type { FiltroMesa } from "@/types/operations";

const GarcomPage = () => {
  const { mesas, dismissChamarGarcom } = useRestaurant();
  const { currentGarcom, logout, authLevel } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mesaIdSelecionada = searchParams.get("mesa")?.trim() ?? "";
  const [filtro, setFiltro] = useState<FiltroMesa>("todas");
  const [mesaBusca, setMesaBusca] = useState("");
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));

  useRouteLock("/garcom");

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!currentGarcom && !isAdminAccess) {
    return (
      <AppLayout title="Garçom">
        <p className="text-center text-muted-foreground py-12">Acesso não autorizado. Faça login na tela inicial.</p>
      </AppLayout>
    );
  }

  const garcomNome = currentGarcom?.nome ?? (isAdminAccess ? "Administrador" : "");

  if (mesaIdSelecionada) {
    return <PedidoFlow modo="garcom" mesaId={mesaIdSelecionada} garcomNome={garcomNome} />;
  }

  const chamadoCount = mesas.filter((m) => m.chamarGarcom).length;

  const mesasFiltradas = mesas.filter((m) => {
    if (filtro === "consumo" && m.status !== "consumo") return false;
    if (filtro === "livres" && m.status !== "livre") return false;
    if (filtro === "chamado" && !m.chamarGarcom) return false;
    if (mesaBusca && !String(m.numero).includes(mesaBusca)) return false;
    return true;
  });

  const filtros: { id: FiltroMesa; label: string; badge?: number }[] = [
    { id: "todas", label: "Todas" },
    { id: "consumo", label: "Em consumo" },
    { id: "livres", label: "Livres" },
    { id: "chamado", label: "Com chamado", badge: chamadoCount },
  ];

  return (
    <ModuleGate moduleKey="mesas" moduleName="Mesas">
    <AppLayout
      title="Mesas"
      headerRight={
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tabular-nums text-muted-foreground">{clock}</span>
          <Button variant="outline" onClick={() => logout("garcom")} className="gap-2 rounded-xl font-bold">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-base font-bold text-foreground">{garcomNome}</p>
        <p className="text-sm text-muted-foreground">Selecione uma mesa para lançar pedidos.</p>
      </div>

      {/* Busca */}
      <div className="relative mb-3" style={{ maxWidth: 200 }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar mesa..."
          value={mesaBusca}
          onChange={(e) => setMesaBusca(e.target.value)}
          className="h-10 rounded-xl pl-9"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        {filtros.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              filtro === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {f.id === "chamado" && <Bell className="h-3.5 w-3.5" />}
            {f.label}
            {f.badge !== undefined && f.badge > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground">
                {f.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {mesasFiltradas.map((mesa, i) => (
          <div
            key={mesa.id}
            className={`slide-up ${mesa.chamarGarcom ? "animate-pulse rounded-2xl ring-2 ring-destructive/60" : ""}`}
            style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: "both" }}
          >
            <div className="relative">
              <MesaCard
                mesa={mesa}
                showIndicators
                onClick={() => {
                  dismissChamarGarcom(mesa.id);
                  setSearchParams({ mesa: mesa.id });
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissChamarGarcom(mesa.id);
                  navigate(`/tablet?mesa=${mesa.id}`);
                }}
                title="Abrir como tablet (modo cliente)"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <TabletSmartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {mesasFiltradas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm font-bold">Nenhuma mesa encontrada para este filtro.</p>
        </div>
      )}

      <LicenseBanner context="operational" />
    </AppLayout>
    </ModuleGate>
  );
};

export default GarcomPage;
