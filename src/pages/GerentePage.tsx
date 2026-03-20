import { useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Calendar,
  ClipboardList,
  CreditCard,
  Download,
  Filter,
  LockKeyhole,
  LogOut,
  ScrollText,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Wallet,
  Plus,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import OperationalAccessCard from "@/components/OperationalAccessCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import type { FechamentoConta } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import type { PaymentMethod } from "@/types/operations";

/* ── helpers ── */
const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Banknote; color: string; bg: string }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-emerald-400", bg: "bg-emerald-500/15" },
  { value: "credito", label: "Crédito", icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/15" },
  { value: "debito", label: "Débito", icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/15" },
  { value: "pix", label: "PIX", icon: Smartphone, color: "text-purple-400", bg: "bg-purple-500/15" },
];

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
  pedido_pronto: "Pedido pronto",
  abertura_caixa: "Abertura de caixa",
  fechamento_dia: "Fechamento do dia",
};

const RELEVANT_LOG_ACTIONS = new Set([
  "fechar_conta",
  "abertura_caixa",
  "fechamento_dia",
  "cancelar_pedido",
  "cancelar_item",
  "zerar_mesa",
]);

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
  if (acao === "pedido_cliente" || acao === "chamar_garcom") return "bg-emerald-500";
  if (acao === "fechar_conta" || acao === "zerar_mesa" || acao === "fechamento_dia") return "bg-blue-500";
  if (acao === "cancelar_item" || acao === "cancelar_pedido") return "bg-destructive";
  return "bg-amber-500";
};

type PeriodoFiltro = "hoje" | "semana" | "mes" | "custom";

const getDateRange = (periodo: PeriodoFiltro, customInicio: string, customFim: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (periodo) {
    case "hoje":
      return { start: today, end: now };
    case "semana": {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { start: weekStart, end: now };
    }
    case "mes":
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: now };
    case "custom":
      return {
        start: customInicio ? new Date(customInicio) : today,
        end: customFim ? new Date(customFim + "T23:59:59.999") : now,
      };
  }
};

const filterByDateRange = (items: FechamentoConta[], start: Date, end: Date) =>
  items.filter((f) => {
    const d = new Date(f.criadoEmIso);
    return d >= start && d <= end;
  });

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
  } = useRestaurant();
  const { currentGerente, logout, verifyManagerAccess, getActiveProfilesByRole, createUser, deactivateUser, activateUser } = useAuth();
  const [logFilter, setLogFilter] = useState("all");
  const [pinVerificado, setPinVerificado] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Relatório state
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("hoje");
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");

  // Equipe state
  const garcons = useMemo(() => getActiveProfilesByRole("garcom"), [getActiveProfilesByRole]);
  const caixas = useMemo(() => getActiveProfilesByRole("caixa"), [getActiveProfilesByRole]);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpPin, setNewEmpPin] = useState("");
  const [newEmpRole, setNewEmpRole] = useState<"garcom" | "caixa">("garcom");
  const [empError, setEmpError] = useState<string | null>(null);


  const handleVerificarPin = useCallback(async () => {
    if (!currentGerente) return;
    setPinError("");
    const result = await verifyManagerAccess(currentGerente.nome, pinInput);
    if (result.ok) {
      setPinVerificado(true);
      setPinInput("");
    } else {
      setPinError(result.error ?? "PIN inválido");
    }
  }, [currentGerente, pinInput, verifyManagerAccess]);

  /* ── shift closing data ── */
  const sumByMethod = (method: PaymentMethod) =>
    fechamentos.reduce((acc, f) => {
      const pags = f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }];
      return acc + pags.filter((p) => p.formaPagamento === method).reduce((s, p) => s + p.valor, 0);
    }, 0);

  const totalVendas = fechamentos.reduce((acc, f) => acc + f.total, 0);
  const entradasExtras = movimentacoesCaixa.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + m.valor, 0);
  const saidas = movimentacoesCaixa.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + m.valor, 0);
  const totalLiquido = fundoTroco + totalVendas + entradasExtras - saidas;

  /* ── audit logs — only relevant actions ── */
  const relevantEvents = useMemo(
    () => eventos.filter((e) => e.acao && RELEVANT_LOG_ACTIONS.has(e.acao)),
    [eventos]
  );

  const filteredEvents = logFilter === "all"
    ? relevantEvents
    : relevantEvents.filter((e) => e.acao === logFilter);

  const uniqueActions = [...new Set(relevantEvents.map((e) => e.acao).filter(Boolean))] as string[];

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

  /* ── relatório data ── */
  const dateRange = getDateRange(periodo, customInicio, customFim);
  const fechFiltrados = filterByDateRange(allFechamentos, dateRange.start, dateRange.end);

  const relTotalFaturado = fechFiltrados.reduce((a, f) => a + f.total, 0);
  const relComandasFechadas = fechFiltrados.length;
  const relTicketMedio = relComandasFechadas > 0 ? relTotalFaturado / relComandasFechadas : 0;

  const relPedidosRealizados = allEventos.filter((e) => {
    const d = new Date(e.criadoEmIso);
    return d >= dateRange.start && d <= dateRange.end && (e.acao === "pedido_cliente" || e.acao === "lancar_pedido");
  }).length;

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { nome: string; qty: number; total: number }>();
    fechFiltrados.forEach((f) => {
      (f.itens || []).forEach((item) => {
        const existing = map.get(item.nome) || { nome: item.nome, qty: 0, total: 0 };
        existing.qty += item.quantidade;
        existing.total += item.precoUnitario * item.quantidade;
        map.set(item.nome, existing);
      });
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }, [fechFiltrados]);

  // Bar chart data
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    fechFiltrados.forEach((f) => {
      const day = f.criadoEmIso.slice(0, 10);
      map.set(day, (map.get(day) || 0) + f.total);
    });
    const entries = [...map.entries()].sort();
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([day, value]) => ({
      day: day.slice(5).replace("-", "/"),
      value,
      height: Math.max((value / max) * 100, 4),
    }));
  }, [fechFiltrados]);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const totals: Record<PaymentMethod, number> = { dinheiro: 0, credito: 0, debito: 0, pix: 0 };
    fechFiltrados.forEach((f) => {
      const pags = f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }];
      pags.forEach((p) => {
        totals[p.formaPagamento] += p.valor;
      });
    });
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    return paymentMethods.map((pm) => ({
      ...pm,
      total: totals[pm.value],
      pct: grandTotal > 0 ? ((totals[pm.value] / grandTotal) * 100).toFixed(1) : "0.0",
    }));
  }, [fechFiltrados]);

  /* ── auth guard ── */
  if (!currentGerente) {
    return (
      <div className="min-h-svh flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
            Gerente
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <OperationalAccessCard role="gerente" />
        </main>
      </div>
    );
  }

  const handleFecharDia = () => {
    fecharCaixaDoDia(currentGerente);
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

  return (
    <div className="h-svh flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 shrink-0 md:px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black tracking-tight text-foreground truncate">Painel do Gerente</h1>
          <p className="text-xs text-muted-foreground truncate">Operador: {currentGerente.nome}</p>
        </div>
        <Button variant="outline" onClick={() => logout("gerente")} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="fechamento" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border bg-card/80 px-4 md:px-6">
          <TabsList className="bg-transparent h-auto p-0 gap-1">
            <TabsTrigger value="fechamento" className="rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary font-bold text-xs px-3 py-2 gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5" />
              Fechamento
            </TabsTrigger>
            <TabsTrigger value="relatorio" className="rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary font-bold text-xs px-3 py-2 gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Relatório
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl data-[state=active]:bg-primary/15 data-[state=active]:text-primary font-bold text-xs px-3 py-2 gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              Logs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ TAB 1: Fechamento do Turno ═══ */}
        <TabsContent value="fechamento" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          {!pinVerificado ? pinGateUI : (
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Payment breakdown */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Vendas por forma de pagamento</h2>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((pm) => {
                  const Icon = pm.icon;
                  const total = sumByMethod(pm.value);
                  return (
                    <div key={pm.value} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pm.bg} ${pm.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground">{pm.label}</p>
                        <p className={`text-lg font-black tabular-nums ${pm.color}`}>{formatPrice(total)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fundo de troco</span>
                <span className="font-bold tabular-nums text-foreground">{formatPrice(fundoTroco)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total vendas</span>
                <span className="font-bold tabular-nums text-foreground">{formatPrice(totalVendas)}</span>
              </div>
              {entradasExtras > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Entradas extras</span>
                  <span className="font-bold tabular-nums text-emerald-400">+ {formatPrice(entradasExtras)}</span>
                </div>
              )}
              {saidas > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saídas</span>
                  <span className="font-bold tabular-nums text-destructive">- {formatPrice(saidas)}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                <span className="text-base font-black text-foreground">Total líquido</span>
                <span className="text-2xl font-black tabular-nums text-primary">{formatPrice(totalLiquido)}</span>
              </div>
            </div>

            {/* Close day button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 rounded-xl text-base font-black gap-2">
                  <XCircle className="h-5 w-5" />
                  Fechar caixa do dia
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmar fechamento do dia
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá zerar todas as mesas, limpar movimentações e fechamentos do turno. Os logs de auditoria serão preservados. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFecharDia} className="rounded-xl font-black bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirmar fechamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          )}
        </TabsContent>

        {/* ═══ TAB 2: Relatórios ═══ */}
        <TabsContent value="relatorio" className="flex-1 overflow-y-auto mt-0">
          {!pinVerificado ? pinGateUI : (
          <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">

            {/* ── Period Filter ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Período
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "hoje", label: "Hoje" },
                  { key: "semana", label: "Esta semana" },
                  { key: "mes", label: "Este mês" },
                  { key: "custom", label: "Personalizado" },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPeriodo(opt.key)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                      periodo === opt.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {periodo === "custom" && (
                <div className="flex gap-3">
                  <input
                    type="date"
                    value={customInicio}
                    onChange={(e) => setCustomInicio(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="date"
                    value={customFim}
                    onChange={(e) => setCustomFim(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total faturado", value: formatPrice(relTotalFaturado), icon: TrendingUp, color: "text-primary" },
                { label: "Ticket médio", value: formatPrice(relTicketMedio), icon: BarChart3, color: "text-amber-400" },
                { label: "Comandas fechadas", value: String(relComandasFechadas), icon: ClipboardList, color: "text-emerald-400" },
                { label: "Pedidos realizados", value: String(relPedidosRealizados), icon: ClipboardList, color: "text-purple-400" },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-secondary ${kpi.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground">{kpi.label}</p>
                    <p className={`text-xl font-black tabular-nums ${kpi.color}`}>{kpi.value}</p>
                  </div>
                );
              })}
            </div>

            {/* ── Bar Chart: Faturamento por dia ── */}
            {chartData.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Faturamento por dia</h2>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-end gap-2 h-44 overflow-x-auto">
                    {chartData.slice(0, 30).map((bar) => (
                      <div key={bar.day} className="flex flex-col items-center justify-end h-full gap-1" style={{ minWidth: 44 }}>
                        <span className="text-[10px] font-bold tabular-nums text-primary whitespace-nowrap">
                          {formatPrice(bar.value)}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-primary/80 transition-all duration-300"
                          style={{ height: `${bar.height}%`, minHeight: 4 }}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Top Products ── */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Produtos mais vendidos</h2>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum dado de produtos no período.</p>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Produto</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Qtd</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Total</span>
                  </div>
                  {topProducts.slice(0, 10).map((prod, i) => (
                    <div key={prod.nome} className={`grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""}`}>
                      <span className="text-sm font-bold text-foreground truncate">{prod.nome}</span>
                      <span className="text-sm font-black tabular-nums text-muted-foreground text-right">{prod.qty}</span>
                      <span className="text-sm font-black tabular-nums text-foreground text-right">{formatPrice(prod.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Payment Breakdown ── */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Formas de pagamento</h2>
              <div className="grid grid-cols-2 gap-3">
                {paymentBreakdown.map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <div key={pm.value} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${pm.bg} ${pm.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-muted-foreground">{pm.label}</p>
                        <p className={`text-lg font-black tabular-nums ${pm.color}`}>{formatPrice(pm.total)}</p>
                        <p className="text-xs font-bold text-muted-foreground">{pm.pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Closed Bills List ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Comandas fechadas no período</h2>
                {fechFiltrados.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold" onClick={() => {
                    const header = "Mesa,Horário,Operador,Itens,Valor,Pagamento\n";
                    const rows = fechFiltrados.map((f) => {
                      const itensStr = (f.itens || []).map((i) => `${i.quantidade}x ${i.nome}`).join("; ");
                      const pgto = f.pagamentos.length > 1
                        ? f.pagamentos.map((p) => `${paymentMethods.find((pm) => pm.value === p.formaPagamento)?.label ?? p.formaPagamento}: R$${p.valor.toFixed(2)}`).join("; ")
                        : paymentMethods.find((pm) => pm.value === f.formaPagamento)?.label ?? f.formaPagamento;
                      return `"Mesa ${String(f.mesaNumero).padStart(2, "0")}","${f.criadoEm}","${f.caixaNome}","${itensStr}","R$ ${f.total.toFixed(2).replace(".", ",")}","${pgto}"`;
                    }).join("\n");
                    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `comandas-${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-3.5 w-3.5" />
                    Exportar CSV
                  </Button>
                )}
              </div>
              {fechFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma comanda fechada neste período.</p>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Mesa</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Horário</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Operador</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Itens</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Valor</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Pagamento</span>
                  </div>
                  {[...fechFiltrados].sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime()).map((f, i) => (
                    <div key={f.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""}`}>
                      <span className="text-sm font-bold text-foreground whitespace-nowrap">Mesa {String(f.mesaNumero).padStart(2, "0")}</span>
                      <span className="text-sm text-muted-foreground">{f.criadoEm}</span>
                      <span className="text-sm text-muted-foreground">{f.caixaNome}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-[160px]">{(f.itens || []).length > 0 ? (f.itens || []).map((item) => `${item.quantidade}x ${item.nome}`).join(", ") : "—"}</span>
                      <span className="text-sm font-black tabular-nums text-foreground text-right">{formatPrice(f.total)}</span>
                      <span className="text-sm text-muted-foreground text-right">
                        {f.pagamentos.length > 1
                          ? `${f.pagamentos.length} formas`
                          : paymentMethods.find((pm) => pm.value === f.formaPagamento)?.label ?? f.formaPagamento}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </TabsContent>

        {/* ═══ TAB 3: Logs de Auditoria ═══ */}
        <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden mt-0">
          {/* Filter bar */}
          <div className="border-b border-border bg-card/50 px-4 py-3 md:px-6 flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-[200px] h-8 rounded-lg text-xs font-bold">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] ?? action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredEvents.length} evento{filteredEvents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Event list */}
          <div className="flex-1 overflow-y-auto p-4 md:px-6">
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
      </Tabs>
    </div>
  );
};

export default GerentePage;
