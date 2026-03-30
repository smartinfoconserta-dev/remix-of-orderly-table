import { useState, useEffect, useCallback } from "react";
import { LogOut, Bell, Search, CreditCard, Smartphone, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";
import ModuleGate from "@/components/ModuleGate";
import LicenseBanner from "@/components/LicenseBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import type { PaymentMethod, FiltroMesa } from "@/types/operations";
import { toast } from "sonner";
import { formatPrice } from "@/components/caixa/caixaHelpers";

type Filtro = "todas" | "consumo" | "livres" | "chamado";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "debito", label: "Débito", icon: Wallet },
];

const GarcomPdvPage = () => {
  const { mesas, dismissChamarGarcom, fecharConta } = useRestaurant();
  const { currentGarcom, logout, authLevel } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";
  const [searchParams, setSearchParams] = useSearchParams();
  const mesaIdSelecionada = searchParams.get("mesa")?.trim() ?? "";
  const [filtro, setFiltro] = useState<FiltroMesa>("todas");
  const [mesaBusca, setMesaBusca] = useState("");
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );

  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [pagamentoMesaId, setPagamentoMesaId] = useState<string | null>(null);
  const [pagamentoMethod, setPagamentoMethod] = useState<PaymentMethod>("pix");
  const [processando, setProcessando] = useState(false);

  useRouteLock("/garcom-pdv");

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleCobrar = useCallback((mesaId: string) => {
    setPagamentoMesaId(mesaId);
    setPagamentoOpen(true);
    setPagamentoMethod("pix");
  }, []);

  const handleConfirmarPagamento = useCallback(() => {
    if (!pagamentoMesaId || !currentGarcom) return;
    setProcessando(true);

    const mesa = mesas.find(m => m.id === pagamentoMesaId);
    if (!mesa || mesa.total === 0) {
      toast.error("Mesa sem consumo para fechar");
      setProcessando(false);
      return;
    }

    fecharConta(pagamentoMesaId, {
      usuario: {
        id: currentGarcom.id,
        nome: currentGarcom.nome,
        role: "garcom" as const,
        criadoEm: currentGarcom.criadoEm || new Date().toISOString(),
      },
      pagamentos: [{
        id: `pag-pdv-${Date.now()}`,
        formaPagamento: pagamentoMethod,
        valor: mesa.total,
      }],
      troco: 0,
      desconto: 0,
      origemOverride: "garcom_pdv",
    });

    toast.success(`Mesa ${mesa.numero} paga com ${
      pagamentoMethod === "pix" ? "PIX" :
      pagamentoMethod === "credito" ? "Crédito" : "Débito"
    }!`, { icon: "💳" });

    setPagamentoOpen(false);
    setPagamentoMesaId(null);
    setProcessando(false);
    setSearchParams({});
  }, [pagamentoMesaId, pagamentoMethod, mesas, fecharConta, currentGarcom, setSearchParams]);

  if (!currentGarcom && !isAdminAccess) {
    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        <AppLayout title="Garçom PDV">
          <p className="text-center text-muted-foreground py-12">
            Acesso não autorizado. Faça login na tela inicial.
          </p>
        </AppLayout>
      </ModuleGate>
    );
  }

  const garcomNome = currentGarcom?.nome ?? (isAdminAccess ? "Administrador" : "");

  // Tela de pagamento digital
  if (pagamentoOpen && pagamentoMesaId) {
    const mesa = mesas.find(m => m.id === pagamentoMesaId);

    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Mesa {mesa?.numero}</p>
              <p className="text-4xl font-black text-foreground mt-2">
                {formatPrice(mesa?.total ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {mesa?.pedidos.length ?? 0} pedido(s) • {mesa?.pedidos.reduce((s, p) => s + p.itens.length, 0) ?? 0} itens
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                Forma de pagamento
              </p>
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPagamentoMethod(opt.value)}
                  className={`w-full flex items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                    pagamentoMethod === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <opt.icon className={`h-6 w-6 ${
                    pagamentoMethod === opt.value ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <span className={`text-lg font-bold ${
                    pagamentoMethod === opt.value ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-bold"
                onClick={() => {
                  setPagamentoOpen(false);
                  setPagamentoMesaId(null);
                }}
              >
                Voltar
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl font-black text-base gap-2"
                disabled={processando}
                onClick={handleConfirmarPagamento}
              >
                <CreditCard className="h-5 w-5" />
                {processando ? "Processando..." : "Confirmar"}
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              Garçom PDV — apenas pagamentos digitais
            </p>
          </div>
        </div>
      </ModuleGate>
    );
  }

  // Tela de pedido (PedidoFlow)
  if (mesaIdSelecionada) {
    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        <PedidoFlow
          modo="garcom"
          mesaId={mesaIdSelecionada}
          garcomNome={garcomNome}
        />
      </ModuleGate>
    );
  }

  // Tela de lista de mesas
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
    <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
      <AppLayout
        title="Garçom PDV"
        headerRight={
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">💳 PDV</span>
            <span className="text-sm font-bold tabular-nums text-muted-foreground">{clock}</span>
            {!isAdminAccess && (
              <Button variant="outline" onClick={() => logout("garcom")} className="gap-2 rounded-xl font-bold">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            )}
          </div>
        }
      >
        <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-base font-bold text-foreground">{garcomNome}</p>
          <p className="text-sm text-muted-foreground">
            Selecione uma mesa para tirar o pedido. Após confirmar, toque em "Cobrar" para receber o pagamento digital.
          </p>
        </div>

        <div className="relative mb-3" style={{ maxWidth: 200 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mesa..."
            value={mesaBusca}
            onChange={(e) => setMesaBusca(e.target.value)}
            className="h-10 rounded-xl pl-9"
          />
        </div>

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
                  if (mesa.status === "consumo" && mesa.total > 0) {
                    // Mesa com consumo — abre tela de cobrança
                    handleCobrar(mesa.id);
                  } else {
                    // Mesa livre ou sem total — abre PedidoFlow
                    setSearchParams({ mesa: mesa.id });
                  }
                }}
              />
              {mesa.status === "consumo" && mesa.total > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCobrar(mesa.id);
                  }}
                  className="mt-1 w-full rounded-xl bg-primary py-2 text-xs font-black text-primary-foreground flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Cobrar {formatPrice(mesa.total)}
                </button>
              )}
            </div>
          ))}
        </div>

        {mesasFiltradas.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm font-bold">Nenhuma mesa encontrada.</p>
          </div>
        )}

        <LicenseBanner context="operational" />
      </AppLayout>
    </ModuleGate>
  );
};

export default GarcomPdvPage;
