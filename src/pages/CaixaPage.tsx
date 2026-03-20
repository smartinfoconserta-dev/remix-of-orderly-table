import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Check,
  Clock,
  CreditCard,
  Landmark,
  LockKeyhole,
  LogOut,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import PedidoFlow from "@/components/PedidoFlow";
import MesaCard from "@/components/MesaCard";
import OperationalAccessCard from "@/components/OperationalAccessCard";
import LicenseBanner from "@/components/LicenseBanner";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import type { PaymentMethod, SplitPayment, UserRole } from "@/types/operations";

/* ── helpers ── */
const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const toCents = (value: number) => Math.round(value * 100);

const parseCurrencyInput = (value: string) => {
  const sanitized = value.trim().replace(/[^\d,.-]/g, "");
  if (!sanitized) return Number.NaN;
  if (sanitized.includes(",")) {
    return Number(sanitized.replace(/\./g, "").replace(",", "."));
  }
  return Number(sanitized);
};

const paymentMethodOptions: Array<{
  value: PaymentMethod;
  label: string;
  icon: typeof Landmark;
  color: string;
  bgColor: string;
  borderColor: string;
  idleBg: string;
  idleBorder: string;
}> = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-emerald-400", bgColor: "bg-emerald-500/15", borderColor: "border-emerald-500/30", idleBg: "bg-[#14532d]/40", idleBorder: "border-[#16a34a]/25" },
  { value: "credito", label: "Crédito", icon: CreditCard, color: "text-blue-400", bgColor: "bg-blue-500/15", borderColor: "border-blue-500/30", idleBg: "bg-[#0c1e3d]", idleBorder: "border-[#1e3a5f]" },
  { value: "debito", label: "Débito", icon: Wallet, color: "text-amber-400", bgColor: "bg-amber-500/15", borderColor: "border-amber-500/30", idleBg: "bg-[#2a1500]", idleBorder: "border-[#7c3900]" },
  { value: "pix", label: "PIX", icon: Smartphone, color: "text-purple-400", bgColor: "bg-purple-500/15", borderColor: "border-purple-500/30", idleBg: "bg-[#1a0a2e]", idleBorder: "border-[#4a1572]" },
];

const getPaymentMethodLabel = (method: PaymentMethod) =>
  paymentMethodOptions.find((option) => option.value === method)?.label ?? method;

const getPaymentMethodStyle = (method: PaymentMethod) =>
  paymentMethodOptions.find((option) => option.value === method) ?? paymentMethodOptions[0];

const QUICK_VALUES = [10, 20, 50, 100];

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
};

/* Event dot color: green=client, yellow=garcom, blue=fechamento */
const getEventDotColor = (evento: { acao?: string; tipo?: string }) => {
  const a = evento.acao ?? evento.tipo ?? "";
  if (a === "pedido_cliente" || a === "chamar_garcom_cliente") return "bg-emerald-500";
  if (a === "fechar_conta" || a === "zerar_mesa") return "bg-blue-500";
  return "bg-amber-500";
};

/* ── types ── */
type CriticalAction =
  | { type: "zerar_mesa"; mesaId: string; mesaNumero: number }
  | { type: "remover_item_carrinho"; mesaId: string; mesaNumero: number; itemUid: string; itemNome: string }
  | { type: "remover_item_pedido"; mesaId: string; mesaNumero: number; pedidoId: string; pedidoNumero: number; itemUid: string; itemNome: string; quantidade: number }
  | { type: "cancelar_pedido"; mesaId: string; mesaNumero: number; pedidoId: string; pedidoNumero: number };

interface CaixaPageProps {
  accessMode?: Extract<UserRole, "caixa" | "gerente">;
}

/* ══════════════════════════════════════ */
/*            CAIXA PAGE                  */
/* ══════════════════════════════════════ */
const CaixaPage = ({ accessMode = "caixa" }: CaixaPageProps) => {
  const {
    mesas,
    eventos,
    fechamentos,
    movimentacoesCaixa,
    caixaAberto,
    abrirCaixa,
    fecharConta,
    fecharCaixaDoDia,
    zerarMesa,
    dismissChamarGarcom,
    updateCartItemQty,
    removeFromCart,
    ajustarItemPedido,
    cancelarPedido,
    registrarMovimentacaoCaixa,
  } = useRestaurant();
  const { currentCaixa, currentGerente, logout, verifyManagerAccess } = useAuth();

  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [comandaOpen, setComandaOpen] = useState(false);
  const [mesaTab, setMesaTab] = useState("comanda");
  const [closingPayments, setClosingPayments] = useState<SplitPayment[]>([]);
  const [closingPaymentMethod, setClosingPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [closingPaymentValue, setClosingPaymentValue] = useState("");
  const [financeUnlocked, setFinanceUnlocked] = useState(accessMode === "gerente");
  const [financeManagerName, setFinanceManagerName] = useState("");
  const [financeManagerPin, setFinanceManagerPin] = useState("");
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [isUnlockingFinance, setIsUnlockingFinance] = useState(false);
  const [criticalAction, setCriticalAction] = useState<CriticalAction | null>(null);
  const [criticalManagerName, setCriticalManagerName] = useState("");
  const [criticalManagerPin, setCriticalManagerPin] = useState("");
  const [criticalReason, setCriticalReason] = useState("");
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [isAuthorizingCriticalAction, setIsAuthorizingCriticalAction] = useState(false);
  const [fundoTrocoInput, setFundoTrocoInput] = useState("");
  const [turnoModalOpen, setTurnoModalOpen] = useState(false);
  const [turnoManagerName, setTurnoManagerName] = useState("");
  const [turnoManagerPin, setTurnoManagerPin] = useState("");
  const [turnoError, setTurnoError] = useState<string | null>(null);
  const [isClosingTurno, setIsClosingTurno] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const mesa = mesaSelecionada ? mesas.find((item) => item.id === mesaSelecionada) ?? null : null;
  const currentOperator = accessMode === "gerente" ? currentGerente : currentCaixa;

  useRouteLock(accessMode === "gerente" ? "/gerente" : "/caixa");

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── financial summary ── */
  const resumoFinanceiro = useMemo(() => {
    const totalDia = fechamentos.reduce((acc, f) => acc + f.total, 0);
    const entradasExtras = movimentacoesCaixa.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + m.valor, 0);
    const saidas = movimentacoesCaixa.filter((m) => m.tipo === "saida").reduce((acc, m) => acc + m.valor, 0);
    const sumByMethod = (method: PaymentMethod) =>
      fechamentos.reduce((acc, f) => {
        const pags = f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }];
        return acc + pags.filter((p) => p.formaPagamento === method).reduce((s, p) => s + p.valor, 0);
      }, 0);
    return { totalDia, dinheiro: sumByMethod("dinheiro"), credito: sumByMethod("credito"), debito: sumByMethod("debito"), pix: sumByMethod("pix"), entradasExtras, saidas };
  }, [fechamentos, movimentacoesCaixa]);

  const mesaLogs = useMemo(() => (mesa ? eventos.filter((e) => e.mesaId === mesa.id) : []), [eventos, mesa]);

  /* ── payment math ── */
  const totalConta = mesa?.total ?? 0;
  const totalContaCents = toCents(totalConta);
  const totalPago = useMemo(() => closingPayments.reduce((acc, p) => acc + p.valor, 0), [closingPayments]);
  const totalPagoCents = toCents(totalPago);
  const valorRestante = Math.max((totalContaCents - totalPagoCents) / 100, 0);
  const fechamentoPronto = totalContaCents > 0 && totalPagoCents === totalContaCents;
  const paymentProgress = totalContaCents > 0 ? Math.min(totalPagoCents / totalContaCents, 1) : 0;

  /* ── callbacks ── */
  const resetCloseAccountState = useCallback(() => {
    setClosingPayments([]);
    setClosingPaymentMethod("dinheiro");
    setClosingPaymentValue("");
  }, []);

  const handleVoltar = useCallback(() => {
    setComandaOpen(false);
    setMesaSelecionada(null);
    setMesaTab("comanda");
    resetCloseAccountState();
  }, [resetCloseAccountState]);

  const handleSelecionarMesa = useCallback(
    (mesaId: string) => {
      dismissChamarGarcom(mesaId);
      setComandaOpen(false);
      setMesaSelecionada(mesaId);
      setMesaTab("comanda");
      resetCloseAccountState();
    },
    [dismissChamarGarcom, resetCloseAccountState],
  );

  const resetCriticalDialog = useCallback(() => {
    setCriticalAction(null);
    setCriticalManagerName("");
    setCriticalManagerPin("");
    setCriticalReason("");
    setCriticalError(null);
    setIsAuthorizingCriticalAction(false);
  }, []);

  /* ── caixa open time (must be before early returns) ── */
  const caixaOpenTime = useMemo(() => {
    const evt = [...eventos].reverse().find(e => e.acao === "abertura_caixa");
    return evt ? evt.criadoEm : null;
  }, [eventos]);

  /* ── auth guard ── */
  if (!currentOperator) {
    return (
      <div className="min-h-svh flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
            {accessMode === "gerente" ? "Gerente" : "Caixa"}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <OperationalAccessCard role={accessMode} />
        </main>
      </div>
    );
  }

  /* ── cash register opening guard (caixa role only) ── */
  if (accessMode === "caixa" && !caixaAberto) {
    const handleAbrirCaixa = () => {
      const valor = parseCurrencyInput(fundoTrocoInput);
      if (!Number.isFinite(valor) || valor < 0) {
        toast.error("Informe um valor válido para o fundo de troco", { duration: 1400 });
        return;
      }
      abrirCaixa(valor, currentOperator);
      toast.success("Caixa aberto com sucesso!", { duration: 1200, icon: "✅" });
    };

    return (
      <div className="min-h-svh flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
            Caixa
          </h1>
          <Button variant="outline" onClick={() => logout(accessMode)} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </header>
        <main className="flex-1 flex items-center justify-center p-4 md:p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Wallet className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-foreground">Abertura de Caixa</h2>
              <p className="text-sm text-muted-foreground">
                Olá, <span className="font-bold text-foreground">{currentOperator.nome}</span>. Informe o valor do fundo de troco para iniciar o turno.
              </p>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Fundo de troco (R$)</label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={fundoTrocoInput}
                onChange={(e) => setFundoTrocoInput(e.target.value)}
                className="text-center text-2xl font-black h-14 rounded-xl"
                onKeyDown={(e) => { if (e.key === "Enter") handleAbrirCaixa(); }}
              />
              <div className="flex gap-2">
                {[50, 100, 200, 300].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFundoTrocoInput(String(v).replace(".", ","))}
                    className="flex-1 rounded-xl border border-border bg-secondary py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary/80"
                  >
                    R$ {v}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAbrirCaixa} className="w-full h-12 rounded-xl text-base font-black gap-2">
              <Check className="h-5 w-5" />
              Abrir Caixa
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (mesa && comandaOpen) {
    return <PedidoFlow modo="caixa" mesaId={mesa.id} garcomNome={currentOperator.nome} onBack={() => setComandaOpen(false)} />;
  }

  const hasSomethingToClose = Boolean(mesa && (mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0));

  /* ── payment handlers ── */
  const handleAddPayment = () => {
    if (!mesa) return;
    const valor = parseCurrencyInput(closingPaymentValue);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido para adicionar o pagamento", { duration: 1400 });
      return;
    }
    if (toCents(valor) > toCents(valorRestante)) {
      toast.error("O valor informado ultrapassa o restante da conta", { duration: 1400 });
      return;
    }
    setClosingPayments((prev) => [
      ...prev,
      { id: `pag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, formaPagamento: closingPaymentMethod, valor: Number(valor.toFixed(2)) },
    ]);
    setClosingPaymentValue("");
  };

  const handleRemovePayment = (paymentId: string) => {
    setClosingPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const handleFechar = () => {
    if (!mesaSelecionada || !mesa) return;
    if (!fechamentoPronto) {
      toast.error("O fechamento só pode ser confirmado quando o total pago for igual ao total da conta", { duration: 1600 });
      return;
    }
    fecharConta(mesaSelecionada, { usuario: currentOperator, pagamentos: closingPayments });
    toast.success(
      closingPayments.length > 1
        ? "Conta fechada com múltiplas formas de pagamento"
        : `Conta fechada em ${getPaymentMethodLabel(closingPayments[0].formaPagamento)}`,
      { duration: 1400, icon: "✅" },
    );
    setMesaSelecionada(null);
    setMesaTab("comanda");
    resetCloseAccountState();
  };

  const handleUnlockFinance = async () => {
    if (!financeManagerName.trim()) { setFinanceError("Informe o nome do gerente"); return; }
    if (!/^\d{4,6}$/.test(financeManagerPin)) { setFinanceError("Informe o PIN do gerente"); return; }
    setIsUnlockingFinance(true);
    setFinanceError(null);
    const result = await verifyManagerAccess(financeManagerName, financeManagerPin);
    if (!result.ok) { setFinanceError(result.error ?? "Não foi possível validar o gerente"); setIsUnlockingFinance(false); return; }
    setFinanceUnlocked(true);
    setFinanceManagerPin("");
    setIsUnlockingFinance(false);
    toast.success("Relatórios financeiros liberados", { duration: 1200, icon: "🛡️" });
  };

  const openCriticalAction = (action: CriticalAction) => {
    setCriticalAction(action);
    setCriticalManagerName(accessMode === "gerente" ? currentOperator.nome : "");
    setCriticalManagerPin("");
    setCriticalReason("");
    setCriticalError(null);
  };

  const getCriticalActionCopy = () => {
    if (!criticalAction) return null;
    switch (criticalAction.type) {
      case "zerar_mesa":
        return { title: "Autorizar zeragem da mesa", description: `Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")} será limpa por completo.`, buttonLabel: "Autorizar zeragem" };
      case "cancelar_pedido":
        return { title: "Autorizar cancelamento do pedido", description: `Pedido #${criticalAction.pedidoNumero} da Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")}.`, buttonLabel: "Autorizar cancelamento" };
      case "remover_item_carrinho":
        return { title: "Autorizar exclusão de item pendente", description: `${criticalAction.itemNome} será removido da Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")}.`, buttonLabel: "Autorizar exclusão" };
      case "remover_item_pedido":
        return { title: "Autorizar exclusão de item do pedido", description: `${criticalAction.itemNome} será removido do Pedido #${criticalAction.pedidoNumero}.`, buttonLabel: "Autorizar exclusão" };
      default:
        return null;
    }
  };

  const handleConfirmCriticalAction = async () => {
    if (!criticalAction) return;
    if (!criticalManagerName.trim()) { setCriticalError("Informe o nome do gerente"); return; }
    if (!/^\d{4,6}$/.test(criticalManagerPin)) { setCriticalError("Informe o PIN do gerente"); return; }
    if (criticalReason.trim().length < 4) { setCriticalError("Informe um motivo com pelo menos 4 caracteres"); return; }
    setIsAuthorizingCriticalAction(true);
    setCriticalError(null);
    const result = await verifyManagerAccess(criticalManagerName, criticalManagerPin);
    if (!result.ok) { setCriticalError(result.error ?? "Não foi possível validar o gerente"); setIsAuthorizingCriticalAction(false); return; }
    const motivo = criticalReason.trim();
    switch (criticalAction.type) {
      case "zerar_mesa":
        zerarMesa(criticalAction.mesaId, { usuario: currentOperator, motivo });
        setMesaSelecionada(null);
        toast.success("Mesa zerada com autorização do gerente", { duration: 1200, icon: "🧹" });
        break;
      case "cancelar_pedido":
        cancelarPedido(criticalAction.mesaId, criticalAction.pedidoId, { usuario: currentOperator, motivo });
        toast.success("Pedido cancelado com autorização do gerente", { duration: 1200, icon: "🛡️" });
        break;
      case "remover_item_carrinho":
        removeFromCart(criticalAction.mesaId, criticalAction.itemUid, { usuario: currentOperator, motivo });
        toast.success("Item removido com autorização do gerente", { duration: 1200, icon: "🗑️" });
        break;
      case "remover_item_pedido":
        ajustarItemPedido(criticalAction.mesaId, criticalAction.pedidoId, criticalAction.itemUid, -criticalAction.quantidade, { usuario: currentOperator, motivo });
        toast.success("Item removido com autorização do gerente", { duration: 1200, icon: "🗑️" });
        break;
    }
    resetCriticalDialog();
  };

  /* ══════════════════════════════════════ */
  /*              RENDER                    */
  /* ══════════════════════════════════════ */
  /* ── KPI counts ── */
  const mesasConsumo = mesas.filter(m => m.status === "consumo").length;
  const mesasPendente = mesas.filter(m => m.status === "pendente").length;
  const mesasLivre = mesas.filter(m => m.status === "livre").length;
  const valorTotalAberto = mesas.filter(m => m.status !== "livre").reduce((acc, m) => acc + m.total, 0);

  /* ── recent activity (last 15 events) ── */
  const recentEvents = eventos.slice(0, 15);

  /* ── mesa time open helper ── */
  const getMesaTimeLabel = (m: typeof mesas[0]): string | undefined => {
    if (m.status !== "consumo" || m.pedidos.length === 0) return undefined;
    const earliest = m.pedidos.reduce((min, p) => {
      const t = new Date(p.criadoEmIso).getTime();
      return t < min ? t : min;
    }, Infinity);
    const mins = Math.floor((currentTime.getTime() - earliest) / 60000);
    if (mins < 1) return "< 1 min";
    return `${mins} min`;
  };

  /* ── turno close handler ── */
  const handleCloseTurno = async () => {
    if (!turnoManagerName.trim()) { setTurnoError("Informe o nome do gerente"); return; }
    if (!/^\d{4,6}$/.test(turnoManagerPin)) { setTurnoError("PIN inválido"); return; }
    setIsClosingTurno(true);
    setTurnoError(null);
    const result = await verifyManagerAccess(turnoManagerName, turnoManagerPin);
    if (!result.ok) { setTurnoError(result.error ?? "Não autorizado"); setIsClosingTurno(false); return; }
    fecharCaixaDoDia(currentOperator);
    setTurnoModalOpen(false);
    setIsClosingTurno(false);
    setTurnoManagerName("");
    setTurnoManagerPin("");
    toast.success("Turno fechado com sucesso!", { duration: 1400, icon: "🔒" });
  };

  const clockStr = currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      <div className="h-svh flex flex-col bg-background overflow-hidden">
        {/* ── MESA DETAIL keeps original header ── */}
        {mesa && (
          <div className="view-fade-in contents">
            <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 shrink-0 md:px-6">
              <button onClick={handleVoltar} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-black tracking-tight text-foreground truncate flex-1">
                Mesa {String(mesa.numero).padStart(2, "0")}
              </h1>
              <Button variant="outline" onClick={() => logout(accessMode)} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </header>

            {/* Mesa detail top bar */}
            <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 md:px-6">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tabular-nums text-foreground">{formatPrice(mesa.total)}</span>
                  <StatusBadge status={mesa.status} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{currentOperator.nome}</span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setComandaOpen(true)} className="rounded-xl font-bold gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Abrir comanda
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openCriticalAction({ type: "zerar_mesa", mesaId: mesa.id, mesaNumero: mesa.numero })} className="rounded-xl font-bold gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Zerar mesa
                  </Button>
                  <Button
                    size="sm"
                    disabled={!hasSomethingToClose}
                    onClick={() => setMesaTab("pagamento")}
                    className="rounded-xl font-black gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Fechar conta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-hidden">
          {!mesa ? (
            /* ─────────────── MAIN VIEW — PROFESSIONAL DESKTOP ─────────────── */
            <div className="flex flex-col h-full view-fade-in">

              {/* ── Professional Header ── */}
              <div className="flex items-center gap-4 border-b border-border bg-card px-5 py-3 shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary font-black text-sm">
                  {currentOperator.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{currentOperator.nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {accessMode === "gerente" ? "Acesso completo" : "Operador de caixa"}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-black tabular-nums text-foreground">{clockStr}</span>
                </div>
                {caixaOpenTime && (
                  <span className="rounded-lg bg-status-consumo/10 border border-status-consumo/20 px-2.5 py-1 text-[10px] font-bold text-status-consumo">
                    Aberto desde {caixaOpenTime}
                  </span>
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTurnoModalOpen(true); setTurnoManagerName(accessMode === "gerente" ? currentOperator.nome : ""); setTurnoManagerPin(""); setTurnoError(null); }}
                  className="rounded-xl font-bold gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Fechar turno
                </Button>
                <Button variant="outline" onClick={() => logout(accessMode)} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>

              {/* ── KPI Bar ── */}
              <div className="flex items-center gap-3 border-b border-border bg-card/60 px-5 py-2.5 shrink-0">
                <div className="flex items-center gap-2 rounded-xl border border-status-consumo/30 bg-status-consumo/8 px-3 py-1.5">
                  <span className="text-lg font-black tabular-nums text-status-consumo leading-none">{mesasConsumo}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-status-consumo/80">Consumo</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-1.5">
                  <span className="text-lg font-black tabular-nums text-amber-400 leading-none">{mesasPendente}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">Pendentes</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3 py-1.5">
                  <span className="text-lg font-black tabular-nums text-muted-foreground leading-none">{mesasLivre}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Livres</span>
                </div>
                <div className="ml-auto flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-4 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Em aberto</span>
                  <span className="text-lg font-black tabular-nums text-primary leading-none">{formatPrice(valorTotalAberto)}</span>
                </div>
              </div>

              {/* ── 2-Column Content ── */}
              <div className="flex flex-1 overflow-hidden">

                {/* ═══ LEFT: Mesa Grid (70%) ═══ */}
                <div className="flex-[7] overflow-y-auto p-5 lg:p-6 scrollbar-hide">
                  <div className="grid gap-3 fade-in" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                    {mesas.map((item, i) => (
                      <div key={item.id} className="slide-up" style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: 'both' }}>
                        <MesaCard
                          mesa={item}
                          onClick={() => handleSelecionarMesa(item.id)}
                          showTotal
                          timeLabel={getMesaTimeLabel(item)}
                          subtle={item.status === "livre"}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ═══ RIGHT: Activity Feed (30%) ═══ */}
                <div className="flex flex-[3] flex-col border-l border-border bg-card/50 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border shrink-0">
                    <ScrollText className="h-4 w-4 text-foreground" />
                    <h2 className="text-sm font-black text-foreground flex-1">Atividade recente</h2>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-status-consumo">
                      <span className="h-1.5 w-1.5 rounded-full bg-status-consumo animate-pulse" />
                      Ao vivo
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {recentEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                        <ScrollText className="h-10 w-10 opacity-20" />
                        <p className="text-sm">Nenhuma atividade ainda.</p>
                      </div>
                    ) : (
                      recentEvents.map((evento) => (
                        <div key={evento.id} className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getEventDotColor(evento)}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground leading-snug">{evento.descricao}</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span className="font-semibold">{evento.usuarioNome ?? "Sistema"}</span>
                              <span>{actionLabels[evento.acao ?? ""] ?? evento.tipo}</span>
                              <span className="tabular-nums">{evento.criadoEm}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────── MESA DETAIL VIEW — DESKTOP 2-COL ─────────────── */
            <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[2fr_3fr] gap-5 p-4 md:p-6 fade-in">

              {/* ═══ LEFT: COMANDA (read-only feel) ═══ */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-base font-black text-foreground flex items-center gap-2">
                    <ReceiptText className="h-4.5 w-4.5 text-primary" />
                    Comanda
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {mesa.pedidos.length === 0 && mesa.carrinho.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                      <ReceiptText className="h-10 w-10 opacity-30" />
                      <p className="text-sm">Nenhum item na comanda.</p>
                    </div>
                  ) : (
                    <>
                      {mesa.pedidos.map((pedido) => (
                        <div key={pedido.id} className="space-y-1">
                          <div className="flex items-center justify-between px-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              Pedido #{pedido.numeroPedido} • {pedido.origem === "garcom" ? `Garçom` : pedido.origem === "caixa" ? `Caixa` : "Cliente"}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 px-2"
                              onClick={() => openCriticalAction({ type: "cancelar_pedido", mesaId: mesa.id, mesaNumero: mesa.numero, pedidoId: pedido.id, pedidoNumero: pedido.numeroPedido })}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                          <div className="rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border bg-secondary/50">
                                  <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">Qtd</th>
                                  <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</th>
                                  <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">Preço</th>
                                  <th className="py-2 px-3 text-right w-24"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {pedido.itens.map((item) => (
                                  <tr key={item.uid} className="hover:bg-secondary/30 transition-colors">
                                    <td className="py-2.5 px-3 tabular-nums text-muted-foreground font-semibold">{item.quantidade}</td>
                                    <td className="py-2.5 px-3">
                                      <p className="font-semibold text-foreground">{item.nome}</p>
                                      {item.adicionais.length > 0 && <p className="text-xs text-primary mt-0.5">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>}
                                      {item.removidos.length > 0 && <p className="text-xs text-destructive mt-0.5">Sem {item.removidos.join(", ")}</p>}
                                    </td>
                                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground">{formatPrice(item.precoUnitario * item.quantidade)}</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          size="icon" variant="ghost" className="h-6 w-6 rounded-md"
                                          onClick={() =>
                                            item.quantidade === 1
                                              ? openCriticalAction({ type: "remover_item_pedido", mesaId: mesa.id, mesaNumero: mesa.numero, pedidoId: pedido.id, pedidoNumero: pedido.numeroPedido, itemUid: item.uid, itemNome: item.nome, quantidade: item.quantidade })
                                              : ajustarItemPedido(mesa.id, pedido.id, item.uid, -1, { usuario: currentOperator })
                                          }
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md" onClick={() => ajustarItemPedido(mesa.id, pedido.id, item.uid, 1, { usuario: currentOperator })}>
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon" variant="ghost" className="h-6 w-6 rounded-md text-destructive hover:bg-destructive/10"
                                          onClick={() => openCriticalAction({ type: "remover_item_pedido", mesaId: mesa.id, mesaNumero: mesa.numero, pedidoId: pedido.id, pedidoNumero: pedido.numeroPedido, itemUid: item.uid, itemNome: item.nome, quantidade: item.quantidade })}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}

                      {/* Pending cart items */}
                      {mesa.carrinho.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-1 text-xs font-bold text-status-pendente uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingCart className="h-3 w-3" />
                            Itens pendentes ({mesa.carrinho.length})
                          </p>
                          <div className="rounded-xl border border-status-pendente/20 overflow-hidden">
                            <table className="w-full text-sm">
                              <tbody className="divide-y divide-border">
                                {mesa.carrinho.map((item) => (
                                  <tr key={item.uid} className="bg-status-pendente/5">
                                    <td className="py-2.5 px-3 tabular-nums text-muted-foreground font-semibold w-16">{item.quantidade}</td>
                                    <td className="py-2.5 px-3 font-semibold text-foreground">{item.nome}</td>
                                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground w-24">{formatPrice(item.precoUnitario * item.quantidade)}</td>
                                    <td className="py-2.5 px-3 text-right w-24">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md"
                                          onClick={() => item.quantidade === 1
                                            ? openCriticalAction({ type: "remover_item_carrinho", mesaId: mesa.id, mesaNumero: mesa.numero, itemUid: item.uid, itemNome: item.nome })
                                            : updateCartItemQty(mesa.id, item.uid, -1, { usuario: currentOperator })
                                          }
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md" onClick={() => updateCartItemQty(mesa.id, item.uid, 1, { usuario: currentOperator })}>
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-destructive hover:bg-destructive/10"
                                          onClick={() => openCriticalAction({ type: "remover_item_carrinho", mesaId: mesa.id, mesaNumero: mesa.numero, itemUid: item.uid, itemNome: item.nome })}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Comanda footer */}
                <div className="border-t border-border px-5 py-4 space-y-2 bg-card">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-semibold">{formatPrice(totalConta)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-foreground">Total</span>
                    <span className="text-xl font-black text-foreground tabular-nums">{formatPrice(totalConta)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border text-muted-foreground">
                    <span className="uppercase tracking-wider font-bold">{mesa.status === "livre" ? "LIVRE" : mesa.status === "pendente" ? "PENDENTE" : "EM CONSUMO"}</span>
                    <span className="tabular-nums font-bold text-foreground">{formatPrice(totalConta)}</span>
                  </div>
                </div>
              </div>

              {/* ═══ RIGHT: PAGAMENTO ═══ */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">

                  {/* Summary row */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">Total da conta</span>
                      <span className="text-2xl font-black text-foreground tabular-nums">{formatPrice(totalConta)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">Total pago</span>
                      <span className={`text-2xl font-black tabular-nums ${fechamentoPronto ? "text-status-consumo" : totalPago > 0 ? "text-primary" : "text-foreground"}`}>
                        {formatPrice(totalPago)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between rounded-2xl p-4 ${fechamentoPronto ? "bg-status-consumo/10" : "bg-destructive/5"}`}>
                      <span className={`text-base font-black ${fechamentoPronto ? "text-status-consumo" : "text-destructive"}`}>Restante</span>
                      <span className={`text-3xl font-black tabular-nums ${fechamentoPronto ? "text-status-consumo" : "text-destructive"}`}>
                        {fechamentoPronto ? (
                          <span className="flex items-center gap-2">
                            <Check className="h-6 w-6" /> Quitado
                          </span>
                        ) : (
                          formatPrice(valorRestante)
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar — red → green */}
                  <div className="relative rounded-full bg-secondary h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${paymentProgress * 100}%`,
                        backgroundColor: fechamentoPronto
                          ? "hsl(var(--status-consumo))"
                          : paymentProgress > 0
                            ? `hsl(${Math.round(paymentProgress * 120)}, 70%, 45%)`
                            : "hsl(var(--destructive) / 0.4)",
                        boxShadow: fechamentoPronto ? "0 0 12px hsl(var(--status-consumo) / 0.5)" : "none",
                      }}
                    />
                    {fechamentoPronto && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Payment method large buttons */}
                  {!fechamentoPronto && totalConta > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethodOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = closingPaymentMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setClosingPaymentMethod(opt.value)}
                            className={`flex items-center justify-center gap-3 rounded-2xl border-2 py-5 px-4 transition-colors ${
                              isSelected
                                ? `border-white ${opt.bgColor}`
                                : `${opt.idleBorder} ${opt.idleBg} opacity-50`
                            }`}
                          >
                            <Icon className={`h-7 w-7 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                            <span className={`text-lg font-black ${isSelected ? "text-white" : "text-muted-foreground"}`}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Input + quick values */}
                  {!fechamentoPronto && totalConta > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Valor</label>
                          <Input value={closingPaymentValue} onChange={(e) => setClosingPaymentValue(e.target.value)} placeholder="Ex.: 25,00" inputMode="decimal" autoComplete="off" className="h-12 rounded-xl text-lg font-bold" />
                        </div>
                        <Button onClick={handleAddPayment} className="rounded-xl font-black h-12 px-6 text-base">
                          <Plus className="h-5 w-5" />
                          Adicionar
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {QUICK_VALUES.map((qv) => (
                          <Button
                            key={qv}
                            type="button"
                            variant="outline"
                            className="rounded-xl font-bold tabular-nums flex-1 h-10"
                            disabled={qv > valorRestante}
                            onClick={() => setClosingPaymentValue(qv.toFixed(2).replace(".", ","))}
                          >
                            +R$ {qv}
                          </Button>
                        ))}
                        {valorRestante > 0 && !QUICK_VALUES.includes(Math.round(valorRestante * 100) / 100) && (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl font-bold tabular-nums flex-1 h-10 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => setClosingPaymentValue(valorRestante.toFixed(2).replace(".", ","))}
                          >
                            Restante
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment list */}
                  {closingPayments.length > 0 && (
                    <div className="space-y-2">
                      {closingPayments.map((payment) => {
                        const style = getPaymentMethodStyle(payment.formaPagamento);
                        const Icon = style.icon;
                        return (
                          <div key={payment.id} className={`flex items-center gap-3 rounded-2xl border ${style.borderColor} ${style.bgColor} px-4 py-3`}>
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bgColor} ${style.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <p className="flex-1 text-sm font-bold text-foreground">{getPaymentMethodLabel(payment.formaPagamento)}</p>
                            <span className={`text-base font-black tabular-nums ${style.color}`}>{formatPrice(payment.valor)}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => handleRemovePayment(payment.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sticky bottom: confirm */}
                <div className="border-t border-border p-5 bg-card space-y-2">
                  <Button
                    onClick={handleFechar}
                    disabled={!fechamentoPronto || closingPayments.length === 0}
                    className={`w-full h-14 rounded-2xl text-lg font-black transition-all ${
                      fechamentoPronto
                        ? "bg-status-consumo text-white hover:bg-status-consumo/90 shadow-[0_0_20px_hsl(var(--status-consumo)/0.3)]"
                        : ""
                    }`}
                  >
                    {fechamentoPronto ? <ShieldCheck className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                    Confirmar fechamento
                  </Button>
                  {!fechamentoPronto && totalConta > 0 && (
                    <p className="text-center text-xs text-muted-foreground">O fechamento só será liberado quando o total pago for exatamente igual ao total da conta.</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* ── CRITICAL ACTION DIALOG ── */}
      <Dialog open={Boolean(criticalAction)} onOpenChange={(open) => !open && resetCriticalDialog()}>
        <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getCriticalActionCopy()?.title}</DialogTitle>
            <DialogDescription>{getCriticalActionCopy()?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
              <Input value={criticalManagerName} onChange={(e) => setCriticalManagerName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
              <Input value={criticalManagerPin} onChange={(e) => setCriticalManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 a 6 dígitos" inputMode="numeric" autoComplete="one-time-code" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Motivo da ação</label>
              <Textarea value={criticalReason} onChange={(e) => setCriticalReason(e.target.value)} placeholder="Descreva o motivo obrigatório desta ação" maxLength={180} className="min-h-[110px] rounded-xl" />
            </div>
            {criticalError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{criticalError}</p>}
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={resetCriticalDialog} className="rounded-xl font-bold">Voltar</Button>
            <Button variant="destructive" onClick={handleConfirmCriticalAction} className="rounded-xl font-black" disabled={isAuthorizingCriticalAction}>
              {getCriticalActionCopy()?.buttonLabel ?? "Autorizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TURNO CLOSE MODAL ── */}
      <Dialog open={turnoModalOpen} onOpenChange={(open) => { if (!open) { setTurnoModalOpen(false); setTurnoError(null); } }}>
        <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-destructive" />
              Fechar turno
            </DialogTitle>
            <DialogDescription>
              Esta ação vai resetar todas as mesas, movimentações e fechamentos do turno atual. Autorização de gerente necessária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
              <Input value={turnoManagerName} onChange={(e) => setTurnoManagerName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
              <Input
                value={turnoManagerPin}
                onChange={(e) => setTurnoManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={(e) => e.key === "Enter" && handleCloseTurno()}
              />
            </div>
            {turnoError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{turnoError}</p>}
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={() => setTurnoModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button variant="destructive" onClick={handleCloseTurno} className="rounded-xl font-black" disabled={isClosingTurno}>
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LicenseBanner blockMode={accessMode === "caixa"} />
    </>
  );
};

export default CaixaPage;
