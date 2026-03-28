import { useEffect, useMemo, useState, useCallback } from "react";
import { Bike } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Calendar,
  Clock,
  ClipboardList,
  CreditCard,
  Download,
  LockKeyhole,
  LogOut,
  Printer,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Timer,
  TrendingUp,
  Wallet,
  Users,
  Tag,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getSistemaConfig } from "@/lib/adminStorage";
import StorePinsManager from "@/components/StorePinsManager";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";

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

  // Relatório state
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("hoje");
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");

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
          data: d.fechado_em ?? d.updated_at,
          diferenca: Number(d.diferenca_dinheiro ?? 0),
          tipo: Number(d.diferenca_dinheiro ?? 0) > 0 ? "sobra" : "quebra",
          motivo: d.diferenca_motivo ?? "",
          operador: d.fechado_por ?? "",
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

  /* ── relatório data ── */
  const dateRange = getDateRange(periodo, customInicio, customFim);
  const fechFiltrados = filterByDateRange(allFechamentos, dateRange.start, dateRange.end);

  const relTotalFaturado = fechFiltrados.filter(f => !f.cancelado).reduce((a, f) => a + f.total, 0);
  const fechCancelados = fechFiltrados.filter(f => f.cancelado);
  const totalCancelado = fechCancelados.reduce((a, f) => a + f.total, 0);
  const relComandasFechadas = fechFiltrados.filter(f => !f.cancelado).length;
  const relTicketMedio = relComandasFechadas > 0 ? relTotalFaturado / relComandasFechadas : 0;

  const fechMesas = useMemo(() =>
    fechFiltrados.filter(f =>
      f.origem === "mesa" ||
      (!f.origem && !String(f.mesaId || "").startsWith("balcao-") && !String(f.mesaId || "").startsWith("totem-") && !String(f.mesaId || "").startsWith("delivery-"))
    ), [fechFiltrados]);

  const fechBalcao = useMemo(() =>
    fechFiltrados.filter(f =>
      f.origem === "balcao" ||
      (!f.origem && String(f.mesaId || "").startsWith("balcao-") && !String(f.mesaId || "").startsWith("delivery-motoboy-"))
    ), [fechFiltrados]);

  const fechTotem = useMemo(() =>
    fechFiltrados.filter(f =>
      f.origem === "totem" ||
      (!f.origem && String(f.mesaId || "").startsWith("totem-"))
    ), [fechFiltrados]);

  const fechDelivery = useMemo(() =>
    fechFiltrados.filter(f =>
      f.origem === "delivery" ||
      (!f.origem && String(f.mesaId || "").startsWith("delivery-") && !String(f.mesaId || "").startsWith("delivery-motoboy-"))
    ), [fechFiltrados]);

  const fechMotoboys = useMemo(() =>
    fechFiltrados.filter(f =>
      f.origem === "motoboy" ||
      (!f.origem && String(f.mesaId || "").startsWith("delivery-motoboy-"))
    ), [fechFiltrados]);

  const totalMesas = useMemo(() => fechMesas.reduce((a, f) => a + f.total, 0), [fechMesas]);
  const totalBalcao = useMemo(() => fechBalcao.reduce((a, f) => a + f.total, 0), [fechBalcao]);
  const totalTotem = useMemo(() => fechTotem.reduce((a, f) => a + f.total, 0), [fechTotem]);
  const totalDelivery = useMemo(() => fechDelivery.reduce((a, f) => a + f.total, 0), [fechDelivery]);
  const totalMotoboys = useMemo(() => fechMotoboys.reduce((a, f) => a + f.total, 0), [fechMotoboys]);

  const diferencasFiltradas = useMemo(() =>
    diferencasCaixa.filter(d => {
      const dt = new Date(d.data);
      return dt >= dateRange.start && dt <= dateRange.end;
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [diferencasCaixa, dateRange]
  );

  const totalSobras = useMemo(() =>
    diferencasFiltradas.filter(d => d.tipo === "sobra").reduce((s, d) => s + d.diferenca, 0),
    [diferencasFiltradas]
  );

  const totalQuebras = useMemo(() =>
    diferencasFiltradas.filter(d => d.tipo === "quebra").reduce((s, d) => s + Math.abs(d.diferenca), 0),
    [diferencasFiltradas]
  );

  const fechMotoboyPeriodo = useMemo(() => {
    return fechamentosMotoboy.filter(f => {
      const d = new Date(f.timestamp);
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [fechamentosMotoboy, dateRange]);

  const resumoPorMotoboy = useMemo(() => {
    const map = new Map<string, {
      nome: string;
      totalEntregas: number;
      totalDinheiro: number;
      totalPix: number;
      totalCredito: number;
      totalDebito: number;
      totalGeral: number;
      conferidos: number;
      pendentes: number;
    }>();
    fechMotoboyPeriodo.forEach(f => {
      const existing = map.get(f.motoboyNome) || {
        nome: f.motoboyNome,
        totalEntregas: 0, totalDinheiro: 0, totalPix: 0,
        totalCredito: 0, totalDebito: 0, totalGeral: 0,
        conferidos: 0, pendentes: 0,
      };
      existing.totalEntregas += f.resumo.totalEntregas || 0;
      existing.totalDinheiro += f.resumo.deveDevolver || 0;
      existing.totalPix += f.resumo.pix || 0;
      existing.totalCredito += f.resumo.credito || 0;
      existing.totalDebito += f.resumo.debito || 0;
      existing.totalGeral += f.resumo.totalAPrestar || 0;
      if (f.status === "conferido") existing.conferidos++;
      else existing.pendentes++;
      map.set(f.motoboyNome, existing);
    });
    return [...map.values()].sort((a, b) => b.totalGeral - a.totalGeral);
  }, [fechMotoboyPeriodo]);

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
    const entries = [...map.entries()].sort().slice(-14);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([day, value]) => ({
      day: `${day.slice(8, 10)}/${day.slice(5, 7)}`,
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

  // New metrics
  const horaDePico = useMemo(() => {
    const map = new Map<string, number>();
    fechFiltrados.forEach((f) => {
      const h = f.criadoEmIso.slice(11, 13);
      map.set(h, (map.get(h) || 0) + f.total);
    });
    if (map.size === 0) return "—";
    const best = [...map.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return `${best}h-${String(Number(best) + 1).padStart(2, "0")}h`;
  }, [fechFiltrados]);

  const cancelamentos = useMemo(() => {
    return allEventos.filter((e) => {
      const d = new Date(e.criadoEmIso);
      return d >= dateRange.start && d <= dateRange.end && (e.acao === "cancelar_item" || e.acao === "cancelar_pedido");
    }).length;
  }, [allEventos, dateRange]);

  const totalDescontos = useMemo(() =>
    fechFiltrados.reduce((acc, f) => acc + (f.desconto ?? 0), 0),
    [fechFiltrados]
  );

  const totalCouvert = useMemo(() =>
    fechFiltrados.reduce((acc, f) => acc + (f.couvert ?? 0), 0),
    [fechFiltrados]
  );

  const pedidosPorGarcom = useMemo(() => {
    const map = new Map<string, { nome: string; pedidos: number; mesas: Set<string> }>();
    allEventos.filter((e) => {
      const d = new Date(e.criadoEmIso);
      return d >= dateRange.start && d <= dateRange.end && e.acao === "lancar_pedido";
    }).forEach((e) => {
      const nome = e.usuarioNome || "Desconhecido";
      const existing = map.get(nome) || { nome, pedidos: 0, mesas: new Set<string>() };
      existing.pedidos += 1;
      if (e.mesaId) existing.mesas.add(e.mesaId);
      map.set(nome, existing);
    });
    return [...map.values()].sort((a, b) => b.pedidos - a.pedidos);
  }, [allEventos, dateRange]);

  const tempoMedioMesa = useMemo(() => {
    if (fechFiltrados.length === 0) return 0;
    // Estimate: use time between first and last event per mesa, or fallback to 45min avg
    // Since we don't have opening time, use a simple estimate from fechamentos
    // We'll check if there's a pattern in eventos for mesa opening
    const tempos: number[] = [];
    fechFiltrados.forEach((f) => {
      const fechTime = new Date(f.criadoEmIso).getTime();
      // Find earliest event for this mesa in the period
      const mesaEvents = allEventos.filter(
        (e) => e.mesaId === f.mesaId && new Date(e.criadoEmIso).getTime() <= fechTime && new Date(e.criadoEmIso) >= dateRange.start
      );
      if (mesaEvents.length > 0) {
        const earliest = Math.min(...mesaEvents.map((e) => new Date(e.criadoEmIso).getTime()));
        const diff = (fechTime - earliest) / 60000;
        if (diff > 0 && diff < 480) tempos.push(diff);
      }
    });
    return tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
  }, [fechFiltrados, allEventos, dateRange]);

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
      <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ backgroundColor: "#1e3a5f" }}>
        <span className="text-sm font-bold text-white">Gerente — {nomeRestaurante}</span>
        <span className="text-xs text-white/70">Operador: {effectiveGerente.nome} • {horaAtual}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10 text-xs gap-1" onClick={() => logout("gerente")}>
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
          ].map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative px-4 py-2 text-xs font-bold text-muted-foreground border border-border border-b-0 -mb-px bg-background data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:border-t-2 data-[state=active]:border-t-primary data-[state=active]:border-b-card rounded-t-sm gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ═══ TAB 1: Fechamento do Turno ═══ */}
        <TabsContent value="fechamento" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          {!pinVerificado ? pinGateUI : (
          <div className="space-y-6">
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
        <TabsContent value="relatorio" className="flex-1 overflow-y-auto p-4 md:p-6 mt-0">
          {!pinVerificado ? pinGateUI : (
          <div className="space-y-6">

            {/* ── Header with Print ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Período
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-bold" onClick={() => {
                const nomeRestaurante = getSistemaConfig().nomeRestaurante || "Relatório";
                const periodoLabel = periodo === "hoje" ? "Hoje" : periodo === "semana" ? "Esta semana" : periodo === "mes" ? "Este mês" : `${customInicio || "—"} a ${customFim || "—"}`;
                const geradoEm = new Date().toLocaleString("pt-BR");
                const operador = effectiveGerente?.nome || "—";

                const prodRows = topProducts.map(p => {
                  const pct = relTotalFaturado > 0 ? ((p.total / relTotalFaturado) * 100).toFixed(1) : "0.0";
                  return `<tr><td>${p.nome}</td><td style="text-align:center">${p.qty}</td><td style="text-align:right">${formatPrice(p.total)}</td><td style="text-align:right">${pct}%</td></tr>`;
                }).join("");
                const bottomProducts = [...topProducts].reverse().slice(0, 5).map(p => {
                  const pct = relTotalFaturado > 0 ? ((p.total / relTotalFaturado) * 100).toFixed(1) : "0.0";
                  return `<tr><td>${p.nome}</td><td style="text-align:center">${p.qty}</td><td style="text-align:right">${formatPrice(p.total)}</td><td style="text-align:right">${pct}%</td></tr>`;
                }).join("");
                const pgtoRows = paymentBreakdown.map(p => `<tr><td>${p.label}</td><td style="text-align:right">${formatPrice(p.total)}</td><td style="text-align:right">${p.pct}%</td></tr>`).join("");
                const garcomRows = pedidosPorGarcom.map(g => `<tr><td>${g.nome}</td><td style="text-align:center">${g.pedidos}</td><td style="text-align:center">${g.mesas.size}</td></tr>`).join("");
                const comandaRows = [...fechFiltrados].sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime()).map(f => {
                  const itensStr = (f.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(", ") || "—";
                  const pgto = f.pagamentos.length > 1
                    ? f.pagamentos.map(p => `${paymentMethods.find(pm => pm.value === p.formaPagamento)?.label ?? p.formaPagamento}: R$${p.valor.toFixed(2)}`).join(", ")
                    : paymentMethods.find(pm => pm.value === f.formaPagamento)?.label ?? f.formaPagamento;
                  const origemLabel = f.origem === "mesa" ? `Mesa ${String(f.mesaNumero).padStart(2,"0")}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem === "motoboy" ? "Motoboy" : f.mesaNumero > 0 ? `Mesa ${String(f.mesaNumero).padStart(2,"0")}` : "Balcão";
                  const descontoStr = (f.desconto ?? 0) > 0 ? ` (sub: ${formatPrice(f.subtotal ?? (f.total + (f.desconto ?? 0)))} desc: -${formatPrice(f.desconto!)})` : "";
                  return `<tr><td>${origemLabel}</td><td>${f.criadoEm}</td><td>${f.caixaNome}</td><td>${itensStr}</td><td style="text-align:right">${formatPrice(f.total)}${descontoStr}</td><td>${pgto}</td></tr>`;
                }).join("");

                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Vendas</title><style>
                  body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:24px;max-width:900px;margin:0 auto}
                  h1{font-size:22px;margin:0}h2{font-size:15px;margin:24px 0 8px;border-bottom:2px solid #333;padding-bottom:4px;page-break-before:auto}
                  .center{text-align:center}.meta{color:#666;font-size:12px}
                  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
                  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
                  th{background:#f5f5f5;font-weight:700}
                  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}
                  .summary-item{border:1px solid #ccc;border-radius:6px;padding:10px}
                  .summary-item .label{font-size:10px;color:#666;text-transform:uppercase}.summary-item .value{font-size:18px;font-weight:900}
                  .footer{margin-top:40px;border-top:1px solid #ccc;padding-top:16px;font-size:11px;color:#666}
                  .signature{margin-top:40px;border-top:1px solid #333;width:250px;text-align:center;padding-top:4px;font-size:11px}
                  @media print{body{padding:0}@page{margin:12mm}h2{page-break-before:auto}}
                </style></head><body>
                  <div class="center">
                    <h1>${nomeRestaurante}</h1>
                    <p style="font-size:16px;font-weight:700;margin:4px 0">Relatório de Vendas</p>
                    <p class="meta">Período: ${periodoLabel} — Gerado em ${geradoEm}</p>
                    <p class="meta">Operador: ${operador}</p>
                  </div>
                  <h2>Resumo Executivo</h2>
                  <div class="summary">
                    <div class="summary-item"><div class="label">Total faturado</div><div class="value">${formatPrice(relTotalFaturado)}</div></div>
                    <div class="summary-item"><div class="label">Ticket médio</div><div class="value">${formatPrice(relTicketMedio)}</div></div>
                    <div class="summary-item"><div class="label">Comandas fechadas</div><div class="value">${relComandasFechadas}</div></div>
                    <div class="summary-item"><div class="label">Pedidos realizados</div><div class="value">${relPedidosRealizados}</div></div>
                    <div class="summary-item"><div class="label">Hora de pico</div><div class="value">${horaDePico}</div></div>
                    <div class="summary-item"><div class="label">Cancelamentos</div><div class="value" style="${cancelamentos > 0 ? "color:red" : ""}">${cancelamentos}</div></div>
                    <div class="summary-item"><div class="label">Tempo médio/mesa</div><div class="value">${tempoMedioMesa > 0 ? tempoMedioMesa + " min" : "—"}</div></div>
                    ${totalDescontos > 0 ? `<div class="summary-item"><div class="label">Descontos dados</div><div class="value" style="color:red">- ${formatPrice(totalDescontos)}</div></div>` : ""}
                    ${totalCouvert > 0 ? `<div class="summary-item"><div class="label">Couvert arrecadado</div><div class="value" style="color:green">${formatPrice(totalCouvert)}</div></div>` : ""}
                  </div>
                  <h2>Produtos Mais Vendidos</h2>
                  <table><thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Total R$</th><th style="text-align:right">% Faturamento</th></tr></thead><tbody>${prodRows || "<tr><td colspan=4 style='text-align:center;color:#999'>Sem dados</td></tr>"}</tbody></table>
                  ${topProducts.length > 5 ? `<h2>Produtos Menos Vendidos</h2><table><thead><tr><th>Produto</th><th style="text-align:center">Qtd</th><th style="text-align:right">Total R$</th><th style="text-align:right">% Faturamento</th></tr></thead><tbody>${bottomProducts}</tbody></table>` : ""}
                  <h2>Origem das Vendas</h2>
                  <table>
                    <thead><tr><th>Origem</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
                    <tbody>
                      <tr><td>🍽️ Salão (Mesas)</td><td style="text-align:right">${formatPrice(totalMesas)}</td><td style="text-align:right">${relTotalFaturado > 0 ? ((totalMesas/relTotalFaturado)*100).toFixed(1) : "0.0"}%</td></tr>
                      <tr><td>🏪 Balcão</td><td style="text-align:right">${formatPrice(totalBalcao)}</td><td style="text-align:right">${relTotalFaturado > 0 ? ((totalBalcao/relTotalFaturado)*100).toFixed(1) : "0.0"}%</td></tr>
                      <tr><td>🖥️ Totem</td><td style="text-align:right">${formatPrice(totalTotem)}</td><td style="text-align:right">${relTotalFaturado > 0 ? ((totalTotem/relTotalFaturado)*100).toFixed(1) : "0.0"}%</td></tr>
                      <tr><td>🛵 Delivery (caixa)</td><td style="text-align:right">${formatPrice(totalDelivery)}</td><td style="text-align:right">${relTotalFaturado > 0 ? ((totalDelivery/relTotalFaturado)*100).toFixed(1) : "0.0"}%</td></tr>
                      <tr><td>🏍️ Motoboys conferidos</td><td style="text-align:right">${formatPrice(totalMotoboys)}</td><td style="text-align:right">${relTotalFaturado > 0 ? ((totalMotoboys/relTotalFaturado)*100).toFixed(1) : "0.0"}%</td></tr>
                    </tbody>
                  </table>
                  <h2>Formas de Pagamento</h2>
                  <table><thead><tr><th>Forma</th><th style="text-align:right">Total R$</th><th style="text-align:right">%</th></tr></thead><tbody>${pgtoRows}</tbody></table>
                  ${pedidosPorGarcom.length > 0 ? `<h2>Desempenho da Equipe</h2><table><thead><tr><th>Garçom</th><th style="text-align:center">Pedidos</th><th style="text-align:center">Mesas atendidas</th></tr></thead><tbody>${garcomRows}</tbody></table>` : ""}
                  <h2>Comandas Fechadas</h2>
                  <table><thead><tr><th>Mesa</th><th>Horário</th><th>Operador</th><th>Itens</th><th style="text-align:right">Valor</th><th>Pagamento</th></tr></thead><tbody>${comandaRows || "<tr><td colspan=6 style='text-align:center;color:#999'>Sem comandas</td></tr>"}</tbody></table>
                  <div class="footer">Relatório gerado em ${geradoEm} por ${operador}</div>
                  <div class="signature">${operador}<br>Gerente responsável</div>
                </body></html>`;

                const w = window.open("", "_blank");
                if (w) { w.document.write(html); w.document.close(); w.print(); }
              }}>
                <Printer className="h-3.5 w-3.5" />
                Imprimir / Salvar PDF
              </Button>
            </div>

            {/* ── Period Filter ── */}
            <div className="space-y-3">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="col-span-2 lg:col-span-2 rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total faturado no período</p>
                </div>
                <p className="text-3xl font-black tabular-nums text-primary">{formatPrice(relTotalFaturado)}</p>
                <div className="grid grid-cols-5 gap-3 pt-2 border-t border-border">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">🍽️ Salão</p>
                    <p className="text-lg font-black tabular-nums text-foreground">{formatPrice(totalMesas)}</p>
                    <p className="text-xs text-muted-foreground">{fechMesas.length} comandas</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">🏪 Balcão</p>
                    <p className="text-lg font-black tabular-nums text-foreground">{formatPrice(totalBalcao)}</p>
                    <p className="text-xs text-muted-foreground">{fechBalcao.length} pedidos</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">🖥️ Totem</p>
                    <p className="text-lg font-black tabular-nums text-foreground">{formatPrice(totalTotem)}</p>
                    <p className="text-xs text-muted-foreground">{fechTotem.length} pedidos</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">🛵 Delivery</p>
                    <p className="text-lg font-black tabular-nums text-foreground">{formatPrice(totalDelivery)}</p>
                    <p className="text-xs text-muted-foreground">{fechDelivery.length} pedidos</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">🏍️ Motoboys</p>
                    <p className="text-lg font-black tabular-nums text-foreground">{formatPrice(totalMotoboys)}</p>
                    <p className="text-xs text-muted-foreground">{fechMotoboys.length} fechamentos</p>
                  </div>
                </div>
              </div>
              {[
                { label: "Ticket médio", value: formatPrice(relTicketMedio), icon: BarChart3, color: "text-amber-400" },
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
              {/* Cancelamentos card */}
              {fechCancelados.length > 0 && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground">Cancelamentos</p>
                  <p className="text-xl font-black tabular-nums text-red-400">{fechCancelados.length} pedido{fechCancelados.length !== 1 ? "s" : ""}</p>
                  <p className="text-sm font-bold tabular-nums text-red-400 line-through">{formatPrice(totalCancelado)}</p>
                </div>
              )}
            </div>

            {/* ── Extra KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { label: "Hora de pico", value: horaDePico, icon: Clock, color: "text-primary" },
                { label: "Cancelamentos", value: String(cancelamentos), icon: XCircle, color: cancelamentos > 0 ? "text-destructive" : "text-muted-foreground" },
                { label: "Tempo médio/mesa", value: tempoMedioMesa > 0 ? `${tempoMedioMesa} min` : "—", icon: Timer, color: "text-amber-400" },
                { label: "Descontos dados", value: formatPrice(totalDescontos), icon: Tag, color: totalDescontos > 0 ? "text-destructive" : "text-muted-foreground" },
                { label: "Couvert arrecadado", value: totalCouvert > 0 ? formatPrice(totalCouvert) : "—", icon: UtensilsCrossed, color: "text-emerald-400" },
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

            {chartData.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Faturamento por dia</h2>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-end gap-2 h-44 overflow-x-auto">
                    {chartData.map((bar) => (
                      <div key={bar.day} className="flex flex-col items-center justify-end h-full gap-1" style={{ minWidth: 40 }}>
                        <span className="text-[10px] font-bold tabular-nums text-primary whitespace-nowrap">
                          {formatPrice(bar.value)}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-primary transition-all duration-300"
                          style={{ height: `${bar.height}%`, minHeight: 4 }}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Desempenho por garçom ── */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Desempenho por garçom</h2>
              {pedidosPorGarcom.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum dado no período.</p>
              ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Garçom</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Pedidos</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Mesas</span>
                  </div>
                  {pedidosPorGarcom.map((g, i) => (
                    <div key={g.nome} className={`grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""}`}>
                      <span className="text-sm font-bold text-foreground truncate">{g.nome}</span>
                      <span className="text-sm font-black tabular-nums text-muted-foreground text-right">{g.pedidos}</span>
                      <span className="text-sm font-black tabular-nums text-foreground text-right">{g.mesas.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            {/* ── Entregas Delivery ── */}
            {(() => {
              const deliveryPedidos = pedidosBalcao.filter((p) => {
                if (p.origem !== "delivery") return false;
                const d = new Date(p.criadoEmIso);
                return d >= dateRange.start && d <= dateRange.end;
              });
              const deliveryFech = fechFiltrados.filter((f) => f.mesaId?.startsWith("balcao-"));
              const totalDelivery = deliveryPedidos.reduce((s, p) => s + p.total, 0) + deliveryFech.reduce((s, f) => s + f.total, 0);
              const entregues = deliveryPedidos.filter((p) => p.statusBalcao === "entregue" || p.statusBalcao === "pago").length + deliveryFech.length;
              const emAndamento = deliveryPedidos.filter((p) => p.statusBalcao === "saiu").length;
              const aguardando = deliveryPedidos.filter((p) => p.statusBalcao === "aberto" || p.statusBalcao === "pronto").length;
              const totalPedidos = deliveryPedidos.length + deliveryFech.length;

              const motoboyMap = new Map<string, number>();
              deliveryPedidos.forEach((p) => {
                if (p.motoboyNome) motoboyMap.set(p.motoboyNome, (motoboyMap.get(p.motoboyNome) || 0) + 1);
              });
              const topMotoboys = [...motoboyMap.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

              if (totalPedidos === 0) return null;

              return (
                <div className="space-y-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Bike className="h-4 w-4" /> Entregas Delivery
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs font-bold text-muted-foreground">Total pedidos</p>
                      <p className="text-lg font-black tabular-nums text-foreground">{totalPedidos}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-xs font-bold text-muted-foreground">Valor total</p>
                      <p className="text-lg font-black tabular-nums text-primary">{formatPrice(totalDelivery)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 font-bold">
                      ✅ Entregues: {entregues}
                    </span>
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 font-bold">
                      🚚 Em andamento: {emAndamento}
                    </span>
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 font-bold">
                      ⏳ Aguardando: {aguardando}
                    </span>
                  </div>
                  {topMotoboys.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50">
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Motoboy</span>
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Entregas</span>
                      </div>
                      {topMotoboys.map(([name, count], i) => (
                        <div key={name} className={`grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""}`}>
                          <span className="text-sm font-bold text-foreground">{name}</span>
                          <span className="text-sm font-black tabular-nums text-foreground text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* ── Prestação de contas — Motoboys ── */}
            {(() => {
              const entregasPorMotoboy = new Map<string, { entregas: number; total: number }>();
              pedidosBalcao.forEach(p => {
                if (p.origem !== "delivery" || !p.motoboyNome) return;
                const d = new Date(p.criadoEmIso);
                if (d < dateRange.start || d > dateRange.end) return;
                if (p.statusBalcao !== "entregue" && p.statusBalcao !== "pago") return;
                const atual = entregasPorMotoboy.get(p.motoboyNome) || { entregas: 0, total: 0 };
                entregasPorMotoboy.set(p.motoboyNome, {
                  entregas: atual.entregas + 1,
                  total: atual.total + p.total,
                });
              });
              if (entregasPorMotoboy.size === 0) return null;
              return (
                <div className="space-y-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    🏍️ Prestação de contas — Motoboys
                  </h2>
                  <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50">
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Motoboy</span>
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Entregas</span>
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Total</span>
                      <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">A prestar</span>
                    </div>
                    {[...entregasPorMotoboy.entries()].map(([nome, dados], i) => (
                      <div key={nome} className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""}`}>
                        <span className="text-sm font-bold text-foreground">{nome}</span>
                        <span className="text-sm tabular-nums text-muted-foreground text-right">{dados.entregas}</span>
                        <span className="text-sm tabular-nums font-bold text-foreground text-right">{formatPrice(dados.total)}</span>
                        <span className="text-sm tabular-nums font-black text-primary text-right">{formatPrice(dados.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* ── Desempenho dos Motoboys (fechamentos) ── */}
            {resumoPorMotoboy.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  🏍️ Desempenho dos Motoboys
                  <span className="text-xs font-normal text-muted-foreground">
                    {fechMotoboyPeriodo.length} fechamento(s) no período
                  </span>
                </h3>
                <div className="space-y-3">
                  {resumoPorMotoboy.map(m => (
                    <div key={m.nome} className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-foreground">{m.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.totalEntregas} entregas ·
                            {m.conferidos > 0 && <span className="text-emerald-400"> {m.conferidos} conferido(s)</span>}
                            {m.pendentes > 0 && <span className="text-amber-400"> {m.pendentes} pendente(s)</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total prestado</p>
                          <p className="text-base font-black text-foreground tabular-nums">
                            {formatPrice(m.totalGeral)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">💵 Dinheiro</p>
                          <p className="text-xs font-black tabular-nums text-amber-400">{formatPrice(m.totalDinheiro)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">📱 PIX</p>
                          <p className="text-xs font-black tabular-nums text-emerald-400">{formatPrice(m.totalPix)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">💳 Crédito</p>
                          <p className="text-xs font-black tabular-nums text-blue-400">{formatPrice(m.totalCredito)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">💳 Débito</p>
                          <p className="text-xs font-black tabular-nums text-blue-400">{formatPrice(m.totalDebito)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {resumoPorMotoboy.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-bold text-muted-foreground">Total delivery no período</span>
                    <span className="text-lg font-black text-primary tabular-nums">
                      {formatPrice(resumoPorMotoboy.reduce((s, m) => s + m.totalGeral, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
            {/* ── Diferenças de caixa ── */}
            {diferencasFiltradas.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    ⚖️ Diferenças de caixa
                    <span className="text-xs font-normal text-muted-foreground">
                      {diferencasFiltradas.length} ocorrência(s)
                    </span>
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    {totalSobras > 0 && (
                      <span className="text-emerald-400 font-bold">↑ Sobras: {formatPrice(totalSobras)}</span>
                    )}
                    {totalQuebras > 0 && (
                      <span className="text-destructive font-bold">↓ Quebras: {formatPrice(totalQuebras)}</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {diferencasFiltradas.map(d => (
                    <div key={d.id} className={`rounded-xl border p-3 space-y-1 ${
                      d.tipo === "sobra"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-destructive/20 bg-destructive/5"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-foreground">{d.dataFormatada}</p>
                          <p className="text-xs text-muted-foreground">
                            Operador: {d.operador} · Gerente: {d.gerente}
                          </p>
                        </div>
                        <span className={`text-base font-black tabular-nums ${
                          d.tipo === "sobra" ? "text-emerald-400" : "text-destructive"
                        }`}>
                          {d.tipo === "sobra" ? "+" : "-"}{formatPrice(Math.abs(d.diferenca))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                        <span>Esperado: {formatPrice(d.esperado)} · Contado: {formatPrice(d.contado)}</span>
                        <span className="italic">{d.motivo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                      const origemLabel = f.origem === "mesa" ? `Mesa ${String(f.mesaNumero).padStart(2, "0")}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem === "motoboy" ? "Motoboy" : f.mesaNumero > 0 ? `Mesa ${String(f.mesaNumero).padStart(2, "0")}` : "Balcão";
                      return `"${origemLabel}","${f.criadoEm}","${f.caixaNome}","${itensStr}","R$ ${f.total.toFixed(2).replace(".", ",")}","${pgto}"`;
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
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-border bg-secondary/50">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Origem</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Horário</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Operador</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Itens</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Valor</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-right">Pagamento</span>
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground text-center">Status</span>
                  </div>
                  {[...fechFiltrados].sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime()).map((f, i) => (
                    <div key={f.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-3 ${i > 0 ? "border-t border-border/50" : ""} ${f.cancelado ? "bg-red-500/5" : ""}`}>
                      <span className={`text-sm font-bold whitespace-nowrap ${f.cancelado ? "text-red-400" : "text-foreground"}`}>{f.origem === "mesa" ? `Mesa ${String(f.mesaNumero).padStart(2, "0")}` : f.origem === "balcao" ? "Balcão" : f.origem === "totem" ? "Totem" : f.origem === "delivery" ? "Delivery" : f.origem === "motoboy" ? "Motoboy" : f.mesaNumero > 0 ? `Mesa ${String(f.mesaNumero).padStart(2, "0")}` : "Balcão"}</span>
                      <span className="text-sm text-muted-foreground">{f.criadoEm}</span>
                      <span className="text-sm text-muted-foreground">{f.caixaNome}</span>
                      <span className="text-sm text-muted-foreground truncate max-w-[160px]">{(f.itens || []).length > 0 ? (f.itens || []).map((item) => `${item.quantidade}x ${item.nome}`).join(", ") : "—"}</span>
                      <span className={`text-sm font-black tabular-nums text-right ${f.cancelado ? "line-through text-red-400" : "text-foreground"}`}>
                        {(f.desconto ?? 0) > 0 ? (
                          <span className="flex flex-col items-end gap-0.5">
                            <span className="text-muted-foreground text-xs line-through">{formatPrice(f.subtotal ?? (f.total + (f.desconto ?? 0)))}</span>
                            <span className="text-red-400 text-xs">- {formatPrice(f.desconto!)}</span>
                            <span>{formatPrice(f.total)}</span>
                          </span>
                        ) : (
                          formatPrice(f.total)
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground text-right">
                        {f.pagamentos.length > 1
                          ? `${f.pagamentos.length} formas`
                          : paymentMethods.find((pm) => pm.value === f.formaPagamento)?.label ?? f.formaPagamento}
                      </span>
                      <span className="text-center">
                        {f.cancelado ? (
                          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400" title={f.canceladoMotivo ? `Motivo: ${f.canceladoMotivo}` : ""}>
                            Cancelado
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                            OK
                          </span>
                        )}
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
