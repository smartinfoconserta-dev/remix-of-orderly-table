import { useEffect, useMemo, useState, useCallback } from "react";
import LicenseBanner from "@/components/LicenseBanner";
import {
  BarChart3,
  LockKeyhole,
  LogOut,
  ScrollText,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import { getSistemaConfig } from "@/lib/adminStorage";
import StorePinsManager from "@/components/StorePinsManager";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import IfoodPainel from "@/components/IfoodPainel";
import GerenteFechamento from "@/components/gerente/GerenteFechamento";
import GerenteRelatorio from "@/components/gerente/GerenteRelatorio";

const actionLabels: Record<string, string> = {
  cancelar_item: "Exclusão de item",
  cancelar_pedido: "Cancelamento de pedido",
  editar_pedido: "Ajuste de pedido",
  fechar_conta: "Fechamento de conta",
  zerar_mesa: "Zeragem de mesa",
  entrada_manual: "Entrada manual",
  saida_manual: "Saída manual",
  chamar_garcom: "Chamada de garçom",
  lancar_pedido: "Lançamento de pedido",
  pedido_cliente: "Pedido do cliente",
  pedido_garcom: "Pedido do garçom",
  pedido_caixa: "Pedido do caixa",
  pedido_pronto: "Pedido pronto",
  abertura_caixa: "Abertura de caixa",
  abrir_caixa: "Abertura de caixa",
  fechar_turno: "Fechamento de turno",
  fechamento_dia: "Fechamento do dia",
  confirmar_delivery: "Delivery confirmado",
  rejeitar_delivery: "Delivery rejeitado",
  delivery_entregue: "Delivery entregue",
  sangria: "Sangria",
  suprimento: "Suprimento",
};

const RELEVANT_LOG_ACTIONS = new Set([
  "pedido_cliente", "pedido_garcom", "pedido_caixa",
  "fechar_conta",
  "confirmar_delivery", "rejeitar_delivery", "delivery_entregue",
  "chamar_garcom",
  "abrir_caixa", "abertura_caixa", "fechar_turno", "fechamento_dia",
  "sangria", "suprimento",
]);

type LogCategory = "all" | "pedidos" | "caixa" | "delivery";
const LOG_CATEGORY_ACTIONS: Record<LogCategory, Set<string> | null> = {
  all: null,
  pedidos: new Set(["pedido_cliente", "pedido_garcom", "pedido_caixa", "fechar_conta", "chamar_garcom"]),
  caixa: new Set(["abrir_caixa", "abertura_caixa", "fechar_turno", "fechamento_dia", "sangria", "suprimento"]),
  delivery: new Set(["confirmar_delivery", "rejeitar_delivery", "delivery_entregue"]),
};

const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === yesterday.getTime()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
};

const getEventDotColor = (acao?: string) => {
  if (!acao) return "bg-muted-foreground";
  if (["pedido_cliente", "pedido_garcom", "pedido_caixa", "chamar_garcom"].includes(acao)) return "bg-emerald-500";
  if (["fechar_conta", "fechar_turno", "fechamento_dia", "abrir_caixa", "abertura_caixa"].includes(acao)) return "bg-blue-500";
  if (["confirmar_delivery", "delivery_entregue"].includes(acao)) return "bg-purple-500";
  if (["rejeitar_delivery"].includes(acao)) return "bg-destructive";
  if (["sangria", "suprimento"].includes(acao)) return "bg-amber-500";
  return "bg-muted-foreground";
};


const GerentePage = () => {
  const {
    eventos,
    fechamentos,
    movimentacoesCaixa,
    mesas,
    fundoTroco,
    caixaAberto,
    fecharCaixaDoDia,
    allFechamentos,
    allEventos,
    allMovimentacoesCaixa,
    pedidosBalcao,
  } = useRestaurant();
  const { currentGerente, logout, verifyManagerAccess, authLevel, operationalSession, supabaseUser } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";
  // Users who logged in via email/password (supabaseUser exists) should bypass PIN
  const isAuthenticatedByPassword = !!supabaseUser;
  const effectiveGerente = currentGerente ?? (isAdminAccess || isAuthenticatedByPassword ? { id: "admin", nome: "Administrador", role: "gerente" as const, criadoEm: "" } : null);
  useRouteLock("/gerente");
  const [logFilter, setLogFilter] = useState<LogCategory>("all");
  const [pinVerificado, setPinVerificado] = useState(isAdminAccess || isAuthenticatedByPassword);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");


  // Store ID for PIN management  
  const { storeId: ctxStoreId } = useStore();
  const equipeStoreId = operationalSession?.storeId ?? ctxStoreId;

  // Fechamentos motoboy (from Supabase)
  const [fechamentosMotoboy, setFechamentosMotoboy] = useState<any[]>([]);
  const [diferencasCaixa, setDiferencasCaixa] = useState<any[]>([]);

  useEffect(() => {
    if (!equipeStoreId) return;
    // Load motoboy fechamentos from DB
    supabase.from("motoboy_fechamentos").select("*").eq("store_id", equipeStoreId)
      .order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => {
        setFechamentosMotoboy((data ?? []).map((f: any) => ({
          motoboyId: f.motoboy_id,
          motoboyNome: f.motoboy_nome,
          status: f.status,
          resumo: f.resumo ?? {},
          timestamp: f.created_at,
          pedidosIds: f.pedidos_ids ?? [],
        })));
      });
    // Load diferenças de caixa from estado_caixa history (closed shifts with diferença)
    supabase.from("estado_caixa").select("*").eq("store_id", equipeStoreId)
      .not("diferenca_dinheiro", "is", null)
      .order("fechado_em", { ascending: false }).limit(100)
      .then(({ data }) => {
        setDiferencasCaixa((data ?? []).filter((d: any) => d.diferenca_dinheiro !== 0 && d.diferenca_dinheiro !== null).map((d: any) => ({
          id: d.id,
          data: d.fechado_em ?? d.updated_at,
          dataFormatada: new Date(d.fechado_em ?? d.updated_at ?? Date.now()).toLocaleDateString("pt-BR"),
          diferenca: Number(d.diferenca_dinheiro ?? 0),
          tipo: Number(d.diferenca_dinheiro ?? 0) > 0 ? "sobra" : "quebra",
          motivo: d.diferenca_motivo ?? "",
          operador: d.fechado_por ?? "",
          gerente: d.conferido_por ?? d.fechado_por ?? "",
          esperado: Number(d.esperado_dinheiro ?? 0),
          contado: Number(d.contado_dinheiro ?? 0),
        })));
      });
  }, [equipeStoreId]);

  const handleVerificarPin = useCallback(async () => {
    if (!effectiveGerente || isAdminAccess) {
      setPinVerificado(true);
      return;
    }
    setPinError("");
    const result = await verifyManagerAccess(effectiveGerente.nome, pinInput);
    if (result.ok) {
      setPinVerificado(true);
      setPinInput("");
    } else {
      setPinError(result.error ?? "PIN inválido");
    }
  }, [effectiveGerente, isAdminAccess, pinInput, verifyManagerAccess]);

  /* ── shift closing data (moved to GerenteFechamento) ── */

  /* ── audit logs — only relevant actions ── */
  const relevantEvents = useMemo(
    () => eventos.filter((e) => e.acao && RELEVANT_LOG_ACTIONS.has(e.acao)),
    [eventos]
  );

  const filteredEvents = useMemo(() => {
    const categorySet = LOG_CATEGORY_ACTIONS[logFilter];
    if (!categorySet) return relevantEvents;
    return relevantEvents.filter((e) => e.acao && categorySet.has(e.acao));
  }, [relevantEvents, logFilter]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: { date: string; label: string; events: typeof filteredEvents }[] = [];
    const map = new Map<string, typeof filteredEvents>();

    filteredEvents.forEach((e) => {
      const dateKey = e.criadoEmIso.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    });

    // Sort dates descending
    const sortedDates = [...map.keys()].sort().reverse();
    sortedDates.forEach((date) => {
      groups.push({ date, label: formatDateHeader(date), events: map.get(date)! });
    });

    return groups;
  }, [filteredEvents]);


  /* ── auth guard ── */
  if (!effectiveGerente) {
    return (
      <div className="min-h-svh flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
            Gerente
          </h1>
        </header>
          <p className="text-center text-muted-foreground py-12">Acesso não autorizado. Faça login na tela inicial.</p>
      </div>
    );
  }

  const handleFecharDia = () => {
    fecharCaixaDoDia(effectiveGerente);
    toast.success("Caixa do dia fechado com sucesso. Estado resetado.", { duration: 2000, icon: "🔒" });
  };

  const pinGateUI = (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-black text-foreground">Verificação de segurança</h2>
        <p className="text-sm text-muted-foreground">Digite seu PIN para acessar os dados financeiros.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pinInput}
          onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleVerificarPin()}
          placeholder="PIN"
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {pinError && <p className="text-sm font-bold text-destructive">{pinError}</p>}
        <Button onClick={handleVerificarPin} disabled={pinInput.length < 4} className="w-full rounded-xl font-black h-11">
          Verificar PIN
        </Button>
      </div>
    </div>
  );

  const nomeRestaurante = getSistemaConfig().nomeRestaurante || "Restaurante";
  const now = new Date();
  const horaAtual = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Title bar — Windows style */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-border bg-card">
        <span className="text-sm font-bold text-foreground">Gerente — {nomeRestaurante}</span>
        <span className="text-xs text-muted-foreground">Operador: {effectiveGerente.nome} • {horaAtual}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-secondary text-xs gap-1" onClick={() => logout("gerente")}>
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </Button>
      </div>

      {/* Tabs — Windows classic style */}
      <Tabs defaultValue="fechamento" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="shrink-0 border-b border-border bg-card px-4 md:px-6 flex h-auto rounded-none p-0">
          {[
            { value: "fechamento", icon: LockKeyhole, label: "Fechamento" },
            { value: "relatorio", icon: BarChart3, label: "Relatório" },
            { value: "logs", icon: ScrollText, label: "Logs" },
            { value: "equipe", icon: Users, label: "Equipe" },
            { value: "ifood", icon: Truck, label: "iFood" },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative px-5 py-2.5 text-sm font-bold text-muted-foreground border border-border border-b-0 -mb-px bg-background data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:border-t-2 data-[state=active]:border-t-primary data-[state=active]:border-b-card rounded-t-sm gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ═══ TAB 1: Fechamento do Turno ═══ */}
        <TabsContent value="fechamento" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <GerenteFechamento
            pinVerificado={pinVerificado}
            pinGateUI={pinGateUI}
            fechamentos={fechamentos}
            movimentacoesCaixa={movimentacoesCaixa}
            fundoTroco={fundoTroco}
            caixaAberto={caixaAberto}
            onFecharDia={handleFecharDia}
          />
        </TabsContent>

        {/* ═══ TAB 2: Relatórios ═══ */}
        <TabsContent value="relatorio" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <GerenteRelatorio
            pinVerificado={pinVerificado}
            pinGateUI={pinGateUI}
            allFechamentos={allFechamentos}
            allEventos={allEventos}
            allMovimentacoesCaixa={allMovimentacoesCaixa}
            pedidosBalcao={pedidosBalcao}
            mesas={mesas}
            fechamentosMotoboy={fechamentosMotoboy}
            diferencasCaixa={diferencasCaixa}
            effectiveGerente={effectiveGerente}
          />
        </TabsContent>

        {/* ═══ TAB 3: Logs de Auditoria ═══ */}
        <TabsContent value="logs" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-border">
            {([
              { key: "all" as LogCategory, label: "Todos" },
              { key: "pedidos" as LogCategory, label: "Pedidos" },
              { key: "caixa" as LogCategory, label: "Caixa" },
              { key: "delivery" as LogCategory, label: "Delivery" },
            ]).map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setLogFilter(pill.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  logFilter === pill.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Event list */}
          <div className="pt-4">
            {groupedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum evento registrado.</p>
            ) : (
              <div className="mx-auto max-w-2xl space-y-5">
                {groupedEvents.map((group) => (
                  <div key={group.date} className="space-y-1.5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground pb-1">{group.label}</h3>
                    {group.events.map((evento) => (
                      <div key={evento.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getEventDotColor(evento.acao)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground leading-snug">{evento.descricao}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            <span className="text-xs text-muted-foreground">{evento.criadoEm}</span>
                            {evento.acao && (
                              <span className="text-xs font-bold text-muted-foreground">
                                {actionLabels[evento.acao] ?? evento.acao}
                              </span>
                            )}
                            {evento.motivo && (
                              <span className="text-xs text-destructive italic">Motivo: {evento.motivo}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═══ TAB 4: Equipe ═══ */}
        <TabsContent value="equipe" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          {!pinVerificado ? pinGateUI : (
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-foreground">Gerenciar equipe</h2>
              <p className="text-sm text-muted-foreground">Crie e gerencie PINs de acesso para cada módulo operacional.</p>
            </div>
            {equipeStoreId ? (
              <StorePinsManager stores={[{ id: equipeStoreId, name: effectiveGerente.nome, slug: "" }]} />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Loja não identificada. Faça login novamente.</p>
            )}
          </div>
          )}
        </TabsContent>

        {/* ═══ TAB 5: iFood ═══ */}
        <TabsContent value="ifood" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          <div className="mx-auto max-w-2xl">
            <IfoodPainel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Status bar — Windows style */}
      <div className="shrink-0 flex items-center gap-0 border-t border-border bg-card text-[10px] text-muted-foreground">
        <span className="px-3 py-1 border-r border-border">● Online</span>
        <span className="px-3 py-1 border-r border-border">Operador: {effectiveGerente.nome}</span>
        <span className="px-3 py-1 border-r border-border">Fechamentos: {fechamentos.length}</span>
        <span className="px-3 py-1">Mesas ativas: {mesas.filter(m => m.status === "consumo").length}</span>
      </div>
      <LicenseBanner context="gerente" />
    </div>
  );
};

export default GerentePage;
