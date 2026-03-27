import { useState, useEffect } from "react";
import { LogOut, Bell, TabletSmartphone } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";

import LicenseBanner from "@/components/LicenseBanner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";

type Filtro = "todas" | "consumo" | "livres" | "chamado";

const GarcomPage = () => {
  const { mesas, dismissChamarGarcom } = useRestaurant();
  const { currentGarcom, logout, authLevel } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const mesaIdSelecionada = searchParams.get("mesa")?.trim() ?? "";
  const [filtro, setFiltro] = useState<Filtro>("todas");
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
    if (filtro === "consumo") return m.status === "consumo";
    if (filtro === "livres") return m.status === "livre";
    if (filtro === "chamado") return m.chamarGarcom;
    return true;
  });

  const filtros: { id: Filtro; label: string; badge?: number }[] = [
    { id: "todas", label: "Todas" },
    { id: "consumo", label: "Em consumo" },
    { id: "livres", label: "Livres" },
    { id: "chamado", label: "Com chamado", badge: chamadoCount },
  ];

  return (
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
            <MesaCard
              mesa={mesa}
              showIndicators
              onClick={() => {
                dismissChamarGarcom(mesa.id);
                setSearchParams({ mesa: mesa.id });
              }}
            />
          </div>
        ))}
      </div>

      {mesasFiltradas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm font-bold">Nenhuma mesa encontrada para este filtro.</p>
        </div>
      )}

      <LicenseBanner blockMode />
    </AppLayout>
  );
};

export default GarcomPage;
