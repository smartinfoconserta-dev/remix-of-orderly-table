import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  LogOut,
  Printer,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  User,
  Wallet,
  X,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import PedidoFlow from "@/components/PedidoFlow";
import CaixaBalcaoFlow from "@/components/caixa/CaixaBalcaoFlow";


import LicenseBanner from "@/components/LicenseBanner";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import type { PaymentMethod, SplitPayment, UserRole } from "@/types/operations";
import { getSistemaConfig } from "@/lib/adminStorage";
import { getActiveStoreId } from "@/lib/sessionManager";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import { upsertClienteDelivery } from "@/lib/deliveryStorage";
import { useCaixaBalcaoState } from "@/hooks/useCaixaBalcaoState";
import { useCaixaDialogsState, type CriticalAction } from "@/hooks/useCaixaDialogsState";
import { useCaixaMesaState } from "@/hooks/useCaixaMesaState";
import { supabase } from "@/integrations/supabase/client";
import IfoodPainel from "@/components/IfoodPainel";

/* ── helpers (centralised) ── */
import {
  normStr,
  formatPrice,
  toCents,
  formatCpfMask,
  parseCurrencyInput,
  paymentMethodOptions,
  getPaymentMethodLabel,
  getPaymentMethodStyle,
  QUICK_VALUES,
  printComanda as printComandaFn,
} from "@/components/caixa/caixaHelpers";
import CaixaDeliveryPanel from "@/components/caixa/CaixaDeliveryPanel";
import CaixaTotemPanel from "@/components/caixa/CaixaTotemPanel";
import CaixaMesaDetail from "@/components/caixa/CaixaMesaDetail";
import CaixaBalcaoDetail from "@/components/caixa/CaixaBalcaoDetail";
import CaixaHistoricoTab from "@/components/caixa/CaixaHistoricoTab";
import CaixaHeader from "@/components/caixa/CaixaHeader";
import CaixaMesasTab from "@/components/caixa/CaixaMesasTab";
import CaixaDialogs from "@/components/caixa/CaixaDialogs";
import CaixaStatusBar from "@/components/caixa/CaixaStatusBar";


interface CaixaPageProps {
  accessMode?: Extract<UserRole, "caixa" | "gerente">;
  deliveryOnly?: boolean;
}

/* ══════════════════════════════════════ */
/*            CAIXA PAGE                  */
/* ══════════════════════════════════════ */
const CaixaPage = ({ accessMode = "caixa", deliveryOnly = false }: CaixaPageProps) => {
  const {
    mesas,
    eventos,
    fechamentos,
    allFechamentos,
    movimentacoesCaixa,
    pedidosBalcao,
    caixaAberto,
    fundoTroco,
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
    criarPedidoBalcao,
    fecharContaBalcao,
    confirmarPedidoBalcao,
    rejeitarPedidoBalcao,
    marcarBalcaoPronto,
    registrarFechamentoMotoboy,
    estornarFechamento,
    marcarBalcaoRetirado,
    cancelarPedidoBalcao,
  } = useRestaurant();
  const { currentCaixa, currentGerente, logout, verifyManagerAccess, verifyEmployeeAccess, authLevel } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";

  /* ── Dialogs state (hook) ── */
  const dialogs = useCaixaDialogsState();
  const {
    criticalAction, setCriticalAction, criticalManagerName, setCriticalManagerName,
    criticalManagerPin, setCriticalManagerPin, criticalReason, setCriticalReason,
    criticalError, setCriticalError, isAuthorizingCriticalAction, setIsAuthorizingCriticalAction,
    resetCriticalDialog,
    descontoModalOpen, setDescontoModalOpen, descontoTipo, setDescontoTipo,
    descontoInput, setDescontoInput, descontoMotivo, setDescontoMotivo,
    descontoManagerName, setDescontoManagerName, descontoManagerPin, setDescontoManagerPin,
    descontoError, setDescontoError, descontoAplicado, setDescontoAplicado,
    estornoModalOpen, setEstornoModalOpen, estornoFechamentoId, setEstornoFechamentoId,
    estornoMotivo, setEstornoMotivo, estornoPin, setEstornoPin,
    estornoNome, setEstornoNome, estornoError, setEstornoError,
    turnoModalOpen, setTurnoModalOpen, turnoManagerName, setTurnoManagerName,
    turnoManagerPin, setTurnoManagerPin, turnoError, setTurnoError,
    isClosingTurno, setIsClosingTurno, turnoReportOpen, setTurnoReportOpen,
    dinheiroContado, setDinheiroContado, motivoDiferenca, setMotivoDiferenca,
    movModalOpen, setMovModalOpen, movTipo, setMovTipo,
    movDescricao, setMovDescricao, movValor, setMovValor, movConfirmStep, setMovConfirmStep,
    buscaComanda, setBuscaComanda, buscaComandaOpen, setBuscaComandaOpen,
    qrScanOpen, setQrScanOpen, qrScanInput, setQrScanInput, qrScanInputRef,
    totemCancelOpen, setTotemCancelOpen, totemCancelMotivo, setTotemCancelMotivo,
    totemCancelPin, setTotemCancelPin, totemCancelError, setTotemCancelError,
    totemCancelLoading, setTotemCancelLoading,
  } = dialogs;
  const [currentTime, setCurrentTime] = useState(new Date());

  /* ── Balcão/Delivery state (hook) ── */
  const balcao = useCaixaBalcaoState(pedidosBalcao);
  const {
    balcaoOpen, setBalcaoOpen, balcaoTipo, setBalcaoTipo,
    balcaoClienteNome, setBalcaoClienteNome, balcaoTelefone, setBalcaoTelefone,
    balcaoEndereco, setBalcaoEndereco, balcaoBairro, setBalcaoBairro,
    balcaoReferencia, setBalcaoReferencia, balcaoFormaPag, setBalcaoFormaPag,
    balcaoTroco, setBalcaoTroco, balcaoCpf, setBalcaoCpf,
    balcaoNumero, setBalcaoNumero, balcaoComplemento, setBalcaoComplemento,
    deliveryBusca, setDeliveryBusca, deliveryResultados, setDeliveryResultados,
    deliveryStep, setDeliveryStep, deliveryCep, setDeliveryCep,
    deliveryCepLoading, setDeliveryCepLoading, deliveryCepErro, setDeliveryCepErro,
    deliveryCidade, setDeliveryCidade,
    balcaoPedidoSelecionado, setBalcaoPedidoSelecionado,
    balcaoPayments, setBalcaoPayments, balcaoPaymentMethod, setBalcaoPaymentMethod,
    balcaoPaymentValue, setBalcaoPaymentValue, balcaoValorEntregue, setBalcaoValorEntregue,
    balcaoFlowAtivo, setBalcaoFlowAtivo,
    deliveryConfirmOpen, setDeliveryConfirmOpen,
    deliveryPendingItens, setDeliveryPendingItens,
    deliveryPendingParaViagem, setDeliveryPendingParaViagem,
    rejectDialogOpen, setRejectDialogOpen, rejectPedidoId, setRejectPedidoId, rejectMotivo, setRejectMotivo,
    confirmTempoId, setConfirmTempoId, confirmTempo, setConfirmTempo,
    confirmTempoCustom, setConfirmTempoCustom, confirmTaxaEntrega, setConfirmTaxaEntrega,
    deliveryTempoEstimado, setDeliveryTempoEstimado,
    buscaDelivery, setBuscaDelivery,
    cpfNotaBalcao, setCpfNotaBalcao, cpfNotaBalcaoOpen, setCpfNotaBalcaoOpen,
    bairrosCache, setBairrosCache, caixaStoreIdRef,
    resetBalcaoStates,
    balcaoPedido,
    balcaoTotalConta, balcaoTotalContaCents,
    balcaoTotalPago, balcaoTotalPagoCents,
    balcaoValorRestante, balcaoFechamentoPronto, balcaoPaymentProgress,
    balcaoValorEntregueNum, balcaoTrocoCalculado,
    pedidosBalcaoAtivos, pedidosDeliveryAtivos, pedidosAguardandoConfirmacao,
    pedidosBalcaoSoAtivos, pedidosTotem, pedidosTotemAtivos,
    pedidosParaRetirar, pedidosEmRota, pedidosDevolvidos, pedidosEntregues, motoboyAtivos,
  } = balcao;
  const globalModulos = useMemo(() => getSistemaConfig()?.modulos ?? {}, []);
  const moduloMesas = globalModulos.mesas !== false;
  const moduloTotem = globalModulos.totem === true;
  const moduloBalcao = globalModulos.balcao === true;
  // isFastFoodGlobal backward compat: true when no mesas and has totem/balcao
  const isFastFoodGlobal = !moduloMesas && (moduloTotem || moduloBalcao);

  const [caixaView, setCaixaView] = useState<"mesas" | "delivery" | "totem" | "historico" | "ifood">(() => {
    if (deliveryOnly) return "delivery";
    if (moduloMesas) return "mesas";
    if (moduloTotem) return "totem";
    if (moduloBalcao) return "delivery";
    return "delivery";
  });
  const [mostrarEntregues, setMostrarEntregues] = useState(false);
  const [filtroMotoboy, setFiltroMotoboy] = useState<string | null>(null);
  const [fechamentosPendentes, setFechamentosPendentes] = useState<any[]>([]);
  const resumoDeliveryTurno = useMemo(() => {
    const conferidos = fechamentosPendentes.filter((f: any) => f.status === "conferido");
    const pendentes = fechamentosPendentes.filter((f: any) => f.status === "aguardando");
    const motoboyNomes = [...new Set(fechamentosPendentes.map((f: any) => f.motoboy_nome).filter(Boolean))] as string[];
    const totalConferido = conferidos.reduce((s: number, f: any) => s + Number(f.resumo?.total ?? 0), 0);
    const totalEntregas = fechamentosPendentes.reduce((s: number, f: any) => s + Number(f.resumo?.totalEntregas ?? 0), 0);
    return { totalEntregas, conferidos: conferidos.length, pendentes: pendentes.length, totalConferido, motoboyNomes };
  }, [fechamentosPendentes]);
  const [fechamentoSelecionado, setFechamentoSelecionado] = useState<any | null>(null);
  const [pinConferencia, setPinConferencia] = useState("");
  const [pinConferenciaErro, setPinConferenciaErro] = useState("");

  // Master aviso state
  const [masterAviso, setMasterAviso] = useState<{ mensagem: string; tipo: string; enviadoEm: string; lido: boolean } | null>(null);
  const [avisoCanDismiss, setAvisoCanDismiss] = useState(true);

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const sistemaConfig = useMemo(() => getSistemaConfig(), []);
  const deliverySeparado = sistemaConfig.deliverySeparado === true;
  const showMesasTab = moduloMesas && !isFastFoodGlobal && !deliveryOnly;
  const showDeliveryTab = deliveryOnly || (!deliverySeparado && sistemaConfig.deliveryAtivo !== false);
  const showTotemTab = (moduloTotem || pedidosTotemAtivos.length > 0) && !deliveryOnly;
  const showIfoodTab = !deliveryOnly;
  const caixaTitle = deliveryOnly ? "Caixa Delivery" : (accessMode === "gerente" ? "Gerente" : "Caixa");
  /* ── Mesa/Payment state (hook) ── */
  const mesaState = useCaixaMesaState({
    mesas, sistemaConfig, accessMode,
    descontoAplicado, setDescontoAplicado,
    setDescontoInput, setDescontoMotivo,
    setDescontoManagerName, setDescontoManagerPin, setDescontoError,
  });
  const {
    mesaSelecionada, setMesaSelecionada, comandaOpen, setComandaOpen,
    mesaTab, setMesaTab, closingPayments, setClosingPayments,
    closingPaymentMethod, setClosingPaymentMethod, closingPaymentValue, setClosingPaymentValue,
    valorEntregue, setValorEntregue, trocoRegistrado, setTrocoRegistrado,
    couvertPessoas, setCouvertPessoas, couvertDispensado, setCouvertDispensado,
    cpfNotaMesa, setCpfNotaMesa, cpfNotaMesaOpen, setCpfNotaMesaOpen,
    financeUnlocked, setFinanceUnlocked, financeManagerName, setFinanceManagerName,
    financeManagerPin, setFinanceManagerPin, financeError, setFinanceError,
    isUnlockingFinance, setIsUnlockingFinance,
    fundoTrocoInput, setFundoTrocoInput,
    mesa, resetCloseAccountState,
    couvertValorUnit, couvertTotal, totalConta, totalContaCents,
    totalPago, totalPagoCents, valorRestante, fechamentoPronto, paymentProgress,
    valorEntregueNum, valorEntregueValido, trocoCalculado, valorDinheiroARegistrar,
  } = mesaState;
  const handleVoltar = useCallback(() => {
    mesaState.handleVoltar(() => {
      setBalcaoPedidoSelecionado(null);
      setBalcaoPayments([]);
      setBalcaoPaymentMethod("dinheiro");
      setBalcaoPaymentValue("");
      setBalcaoValorEntregue("");
      setCpfNotaBalcao("");
      setCpfNotaBalcaoOpen(false);
    });
  }, [mesaState.handleVoltar, setBalcaoPedidoSelecionado, setBalcaoPayments, setBalcaoPaymentMethod, setBalcaoPaymentValue, setBalcaoValorEntregue, setCpfNotaBalcao, setCpfNotaBalcaoOpen]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevAguardandoRef = useRef<number | null>(null);

  const adminOperator = isAdminAccess ? { id: "admin", nome: "Administrador", role: "caixa" as const, criadoEm: "" } : null;
  const currentOperator = adminOperator ?? (accessMode === "gerente" ? currentGerente : currentCaixa);
  const hasCaixaAccess = isAdminAccess || (accessMode === "gerente"
    ? currentGerente?.role === "gerente" || currentGerente?.id === "seed-admin-001"
    : currentCaixa?.role === "caixa" || currentCaixa?.role === "gerente" || currentCaixa?.role === "delivery" || currentCaixa?.id === "seed-admin-001");

  useRouteLock(accessMode === "gerente" ? "/gerente" : "/caixa");

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "F2":
          e.preventDefault();
          setBuscaComandaOpen(true);
          break;
        case "F3":
          e.preventDefault();
          setQrScanOpen(true);
          break;
        case "F4":
          e.preventDefault();
          setBalcaoTipo("balcao");
          setBalcaoOpen(true);
          break;
        case "F5":
          e.preventDefault();
          setBalcaoTipo("delivery");
          setBalcaoOpen(true);
          break;
        case "Escape":
          e.preventDefault();
          handleVoltar();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleVoltar, setBuscaComandaOpen, setQrScanOpen, setBalcaoTipo, setBalcaoOpen]);

  // (legacy modoOperacao removed — modules now control tabs)

  // Poll motoboy fechamentos from Supabase every 5s
  useEffect(() => {
    const storeId = getActiveStoreId();
    if (!storeId) return;

    const loadAviso = async () => {
      const { data } = await supabase.from("restaurant_config").select("aviso_master").eq("store_id", storeId).limit(1);
      const aviso = data?.[0]?.aviso_master as any;
      if (!aviso || aviso.lido) { setMasterAviso(null); return; }
      setMasterAviso(aviso);
      if (aviso.tipo === "urgente") {
        setAvisoCanDismiss(false);
        setTimeout(() => setAvisoCanDismiss(true), 60000);
      } else {
        setAvisoCanDismiss(true);
      }
    };
    loadAviso();

    // Realtime subscription for aviso updates
    const channel = supabase
      .channel(`aviso-${storeId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "restaurant_config", filter: `store_id=eq.${storeId}` }, (payload) => {
        const aviso = (payload.new as any).aviso_master;
        if (!aviso || aviso.lido) { setMasterAviso(null); return; }
        setMasterAviso(aviso);
        if (aviso.tipo === "urgente") {
          setAvisoCanDismiss(false);
          setTimeout(() => setAvisoCanDismiss(true), 60000);
        } else {
          setAvisoCanDismiss(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Live clock + desktop detection
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => { clearInterval(id); window.removeEventListener("resize", handleResize); };
  }, []);

  // Sound when new delivery arrives
  const aguardandoCount = useMemo(() => pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao === "aguardando_confirmacao").length, [pedidosBalcao]);
  useEffect(() => {
    if (prevAguardandoRef.current !== null && aguardandoCount > prevAguardandoRef.current) {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 1046;
          osc.type = "sine";
          gain.gain.value = 0.3;
          osc.connect(gain).connect(ctx.destination);
          const start = ctx.currentTime + i * 0.35;
          osc.start(start);
          osc.stop(start + 0.15);
        }
      } catch {}
    }
    prevAguardandoRef.current = aguardandoCount;
  }, [aguardandoCount]);

  useEffect(() => {
    if (aguardandoCount > 0) {
      document.title = "🔔 DELIVERY — Caixa";
    } else {
      document.title = "Caixa — Orderly Table";
    }
    return () => { document.title = "Orderly Table"; };
  }, [aguardandoCount]);

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

  const fechamentosDaMesa = useMemo(() =>
    fechamentos
      .filter(f => f.mesaId === mesa?.id || f.mesaNumero === mesa?.numero)
      .sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime())
      .slice(0, 20),
    [fechamentos, mesa]
  );

  const resultadosBusca = useMemo(() => {
    const q = buscaComanda.trim();
    if (!q) return [];
    return allFechamentos
      .filter(f => {
        const numStr = String(f.numeroComanda ?? "").padStart(4, "0");
        const mesaStr = String(f.mesaNumero ?? "").padStart(2, "0");
        return (
          numStr.includes(q.replace("#", "")) ||
          mesaStr.includes(q) ||
          (f.caixaNome ?? "").toLowerCase().includes(q.toLowerCase())
        );
      })
      .sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime())
      .slice(0, 20);
  }, [buscaComanda, allFechamentos]);


  /* ── callbacks ── */

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


  /* ── caixa open time (must be before early returns) ── */
  const caixaOpenTime = useMemo(() => {
    const evt = [...eventos].reverse().find(e => e.acao === "abertura_caixa");
    return evt ? evt.criadoEm : null;
  }, [eventos]);

  const handleRegistrarMovimentacao = useCallback(() => {
    if (!currentOperator) return;
    const valor = parseCurrencyInput(movValor);
    if (!Number.isFinite(valor) || valor < 0.01) {
      toast.error("Informe um valor mínimo de R$ 0,01", { duration: 1400 });
      return;
    }
    if (!movDescricao.trim()) {
      toast.error("Informe o motivo da movimentação", { duration: 1400 });
      return;
    }
    if (!movConfirmStep) {
      setMovConfirmStep(true);
      return;
    }
    registrarMovimentacaoCaixa({
      tipo: movTipo,
      descricao: movDescricao.trim(),
      valor,
      usuario: currentOperator,
    });
    const tipoLabel = movTipo === "entrada" ? "Suprimento" : "Sangria";
    toast.success(`${tipoLabel} de ${formatPrice(valor)} registrado — ${movDescricao.trim()}`, { duration: 2000, icon: movTipo === "entrada" ? "💰" : "💸" });
    setMovModalOpen(false);
    setMovDescricao("");
    setMovValor("");
    setMovTipo("entrada");
    setMovConfirmStep(false);
  }, [currentOperator, movTipo, movDescricao, movValor, movConfirmStep, registrarMovimentacaoCaixa]);


  /* ── Print receipt helper (must be before early returns) ── */
  const handlePrintComanda = useCallback((data: Parameters<typeof import("@/components/caixa/caixaHelpers").printComanda>[0]) => {
    printComandaFn(data, sistemaConfig.nomeRestaurante || "Restaurante");
  }, [sistemaConfig.nomeRestaurante]);
  const [qrRetiradaPedidoId, setQrRetiradaPedidoId] = useState<string | null>(null);
  const qrRetiradaTimerRef = useRef<number | null>(null);


  const handleQrScan = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    let numeroBuscado: number | null = null;
    if (value.startsWith("RETIRADA:")) {
      const after = value.replace("RETIRADA:", "");
      numeroBuscado = parseInt(after, 10);
    } else {
      numeroBuscado = parseInt(value, 10);
    }
    if (!numeroBuscado || isNaN(numeroBuscado)) {
      toast.error("Código inválido");
      return;
    }
    const pedido = pedidosBalcao.find((p) => p.numeroPedido === numeroBuscado);
    if (!pedido) {
      toast.error("Pedido não encontrado");
      return;
    }
    if (pedido.statusBalcao === "retirado") {
      toast("Pedido já foi retirado");
      return;
    }
    if (pedido.statusBalcao !== "pronto") {
      toast.error("Pedido não está pronto para retirada");
      return;
    }
    marcarBalcaoRetirado(pedido.id);
    toast.success(`Pedido #${String(numeroBuscado).padStart(3, "0")} retirado!`);
  }, [pedidosBalcao, marcarBalcaoRetirado]);


  if (!currentOperator || !hasCaixaAccess) {
    return (
      <div className="min-h-svh flex flex-col bg-background">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
            {caixaTitle}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <p className="text-center text-muted-foreground py-12">Acesso não autorizado. Faça login na tela inicial.</p>
        </main>
      </div>
    );
  }

  /* ── cash register opening guard (caixa role only) ── */
  if (accessMode === "caixa" && !caixaAberto) {
    // Check if this operator already opened caixa this shift
    const OPERADORES_KEY = "obsidian-caixa-operadores-v1";
    const getOperadoresShift = (): string[] => {
      try { const raw = localStorage.getItem(OPERADORES_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
    };
    const operadorJaAbriu = currentOperator ? getOperadoresShift().includes(currentOperator.id) : false;

    if (operadorJaAbriu) {
      // Re-open caixa automatically with 0 fundo (already contributed before)
      abrirCaixa(0, currentOperator);
    }

    const handleAbrirCaixa = () => {
      const valor = parseCurrencyInput(fundoTrocoInput);
      if (!Number.isFinite(valor) || valor < 0) {
        toast.error("Informe um valor válido para o fundo de troco", { duration: 1400 });
        return;
      }
      // Track this operator
      const ops = getOperadoresShift();
      if (currentOperator && !ops.includes(currentOperator.id)) {
        localStorage.setItem(OPERADORES_KEY, JSON.stringify([...ops, currentOperator.id]));
      }
      // legacy modoOperacao localStorage removed
      abrirCaixa(valor, currentOperator);
      // fundo_proximo is now managed via estado_caixa in Supabase
      toast.success("Caixa aberto com sucesso!", { duration: 1200, icon: "✅" });
    };

    // If operator already opened, the abrirCaixa(0) above will re-render and skip this block
    if (!operadorJaAbriu) {
      return (
        <div className="min-h-svh flex flex-col bg-background">
          <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
            <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
              {caixaTitle}
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
                {fundoTrocoInput ? (
                  <p className="text-sm text-muted-foreground">
                    Olá, <span className="font-bold text-foreground">{currentOperator.nome}</span>. Valor do último fechamento carregado automaticamente. Corrija se necessário.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Olá, <span className="font-bold text-foreground">{currentOperator.nome}</span>. Conte o dinheiro na gaveta e informe o valor inicial do caixa.
                  </p>
                )}
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
  }

  async function handleDeliveryConfirm(avisarCliente = false) {
    upsertClienteDelivery({
      nome: balcaoClienteNome.trim(),
      cpf: balcaoCpf.trim(),
      telefone: balcaoTelefone.trim(),
      endereco: balcaoEndereco.trim(),
      numero: balcaoNumero.trim(),
      bairro: balcaoBairro.trim(),
      complemento: balcaoComplemento.trim(),
      referencia: balcaoReferencia.trim(),
    }, caixaStoreIdRef.current);

    const bairrosDisp = bairrosCache.filter((b) => b.ativo);
    const matchBairro = balcaoBairro.trim() ? bairrosDisp.find((b) => normStr(b.nome) === normStr(balcaoBairro)) : null;
    const taxa = matchBairro ? matchBairro.taxa : 0;
    const totalItens = deliveryPendingItens.reduce((s, it) => s + it.precoUnitario * it.quantidade, 0);
    const totalFinal = totalItens + taxa;

    const numeroPedido = await criarPedidoBalcao({
      itens: deliveryPendingItens,
      origem: "delivery",
      operador: currentOperator,
      clienteNome: balcaoClienteNome.trim() || undefined,
      clienteTelefone: balcaoTelefone || undefined,
      enderecoCompleto: balcaoEndereco ? `${balcaoEndereco}${balcaoNumero ? `, ${balcaoNumero}` : ""}` : undefined,
      bairro: balcaoBairro || undefined,
      referencia: balcaoReferencia || undefined,
      formaPagamentoDelivery: balcaoFormaPag,
      trocoParaQuanto: balcaoFormaPag === "dinheiro" ? parseCurrencyInput(balcaoTroco) || undefined : undefined,
      taxaEntrega: taxa,
      skipConfirmacao: true,
    });

    toast.success(`Pedido delivery enviado para ${balcaoClienteNome}`, { duration: 1600, icon: "🍽️" });

    if (avisarCliente && balcaoTelefone.trim()) {
      const tel = balcaoTelefone.replace(/\D/g, "");
      const formasPag: Record<string, string> = { dinheiro: "Dinheiro", credito: "Cartão de Crédito", debito: "Cartão de Débito", pix: "PIX" };
      const tempo = deliveryTempoEstimado.trim() || sistemaConfig.tempoEntrega || "40";
      const msg = [
        `Olá ${balcaoClienteNome.trim()}! Seu pedido #${numeroPedido} foi confirmado.`,
        `🛵 Tempo estimado: ${tempo} minutos.`,
        `💰 Total: ${formatPrice(totalFinal)}${taxa > 0 ? ` (inclui taxa de entrega de ${formatPrice(taxa)})` : ""}.`,
        `Forma de pagamento: ${formasPag[balcaoFormaPag] || balcaoFormaPag}.`,
        `Obrigado! 😊`,
      ].join("\n");
      window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
    }

    setDeliveryConfirmOpen(false);
    setDeliveryPendingItens([]);
    setDeliveryTempoEstimado("");
    resetBalcaoStates();
  }

  if (balcaoFlowAtivo) {
    const handleBalcaoConfirmado = async (itens: ItemCarrinho[], paraViagem: boolean) => {
      if (balcaoTipo === "delivery") {
        setDeliveryPendingItens(itens);
        setDeliveryPendingParaViagem(paraViagem);
        setBalcaoFormaPag("dinheiro");
        setBalcaoTroco("");
        setBalcaoFlowAtivo(false);
        setDeliveryConfirmOpen(true);
        return;
      }
      await criarPedidoBalcao({
        itens,
        origem: "balcao",
        operador: currentOperator,
        clienteNome: balcaoClienteNome.trim() || undefined,
        clienteTelefone: balcaoTelefone || undefined,
      });
      toast.success(`Pedido balcão enviado — ${balcaoClienteNome}`, { duration: 1600, icon: "🍽️" });
      resetBalcaoStates();
    };

    return (
      <CaixaBalcaoFlow
        balcaoTipo={balcaoTipo}
        balcaoClienteNome={balcaoClienteNome}
        onPedidoConfirmado={handleBalcaoConfirmado}
        onBack={() => setBalcaoFlowAtivo(false)}
      />
    );
  }

  if (mesa && comandaOpen) {
    return <PedidoFlow modo="caixa" mesaId={mesa.id} garcomNome={currentOperator.nome} onBack={() => setComandaOpen(false)} />;
  }

  const hasSomethingToClose = Boolean(mesa && (mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0));

  /* ── payment handlers ── */
  const handleAddPayment = () => {
    if (!mesa) return;
    const entregou = parseCurrencyInput(closingPaymentValue);
    if (!Number.isFinite(entregou) || entregou <= 0) {
      toast.error("Informe um valor válido", { duration: 1400 });
      return;
    }
    // Para dinheiro: registra o restante (não o valor entregue) se entregou mais
    const valorARegistrar = closingPaymentMethod === "dinheiro" && entregou > valorRestante
      ? valorRestante
      : Math.min(entregou, valorRestante);
    const troco = closingPaymentMethod === "dinheiro" && entregou > valorRestante
      ? entregou - valorRestante
      : 0;
    if (closingPaymentMethod !== "dinheiro" && toCents(entregou) > toCents(valorRestante)) {
      toast.error("O valor informado ultrapassa o restante da conta", { duration: 1400 });
      return;
    }
    if (troco > 0) setTrocoRegistrado(troco);
    setClosingPayments((prev) => [
      ...prev,
      { id: `pag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, formaPagamento: closingPaymentMethod, valor: Number(valorARegistrar.toFixed(2)) },
    ]);
    setClosingPaymentValue("");
  };

  const handleRemovePayment = (paymentId: string) => {
    setClosingPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const handleAplicarDesconto = async () => {
    if (!descontoMotivo.trim()) { setDescontoError("Informe o motivo"); return; }
    if (!descontoManagerName.trim()) { setDescontoError("Informe o nome do gerente"); return; }
    if (!/^\d{4,6}$/.test(descontoManagerPin)) { setDescontoError("PIN inválido"); return; }
    const result = await verifyManagerAccess(descontoManagerName, descontoManagerPin);
    if (!result.ok) { setDescontoError(result.error ?? "PIN incorreto"); return; }
    const val = parseCurrencyInput(descontoInput);
    if (!Number.isFinite(val) || val <= 0) { setDescontoError("Valor inválido"); return; }
    const totalOriginal = mesa?.total ?? 0;
    const desconto = descontoTipo === "percentual"
      ? totalOriginal * (val / 100)
      : Math.min(val, totalOriginal);
    setDescontoAplicado(desconto);
    setDescontoModalOpen(false);
    setDescontoInput(""); setDescontoMotivo("");
    setDescontoManagerName(""); setDescontoManagerPin(""); setDescontoError(null);
    toast.success(`Desconto de ${formatPrice(desconto)} aplicado`, { duration: 2000, icon: "🎁" });
  };

  const handleEstornar = async () => {
    if (!estornoMotivo.trim()) { setEstornoError("Informe o motivo do estorno"); return; }
    if (!estornoNome.trim()) { setEstornoError("Informe o nome do gerente"); return; }
    if (!/^\d{4,6}$/.test(estornoPin)) { setEstornoError("PIN inválido"); return; }
    const result = await verifyManagerAccess(estornoNome, estornoPin);
    if (!result.ok) { setEstornoError(result.error ?? "PIN incorreto"); return; }
    if (!estornoFechamentoId) return;
    estornarFechamento(estornoFechamentoId, estornoMotivo, currentOperator);
    setEstornoModalOpen(false);
    setEstornoFechamentoId(null);
    setEstornoMotivo("");
    setEstornoPin("");
    setEstornoNome("");
    setEstornoError(null);
    toast.success("Fechamento estornado — registrado no log", { duration: 2500, icon: "↩️" });
  };

  const handleFechar = () => {
    if (!mesaSelecionada || !mesa) return;
    if (!fechamentoPronto) {
      toast.error("O fechamento só pode ser confirmado quando o total pago for igual ao total da conta", { duration: 1600 });
      return;
    }
    fecharConta(mesaSelecionada, { usuario: currentOperator, pagamentos: closingPayments, troco: trocoRegistrado, desconto: descontoAplicado, couvert: couvertTotal, numeroPessoas: couvertPessoas, cpfNota: cpfNotaMesa.trim() || undefined });
    toast.success(
      trocoRegistrado > 0
        ? `Conta fechada — Troco: ${formatPrice(trocoRegistrado)}`
        : closingPayments.length > 1
          ? "Conta fechada — múltiplas formas"
          : `Conta fechada em ${getPaymentMethodLabel(closingPayments[0].formaPagamento)}`,
      { duration: 2500, icon: "✅" },
    );
    setMesaSelecionada(null);
    setMesaTab("comanda");
    resetCloseAccountState();
  };

  /* ── balcão payment handlers ── */
  const handleAddBalcaoPayment = () => {
    if (!balcaoPedido) return;
    const valor = parseCurrencyInput(balcaoPaymentValue);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido", { duration: 1400 });
      return;
    }
    if (toCents(valor) > toCents(balcaoValorRestante)) {
      toast.error("O valor ultrapassa o restante da conta", { duration: 1400 });
      return;
    }
    setBalcaoPayments((prev) => [
      ...prev,
      { id: `pag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, formaPagamento: balcaoPaymentMethod, valor: Number(valor.toFixed(2)) },
    ]);
    setBalcaoPaymentValue("");
  };

  const handleFecharBalcao = () => {
    if (!balcaoPedidoSelecionado || !balcaoPedido) return;
    if (!balcaoFechamentoPronto) {
      toast.error("O total pago deve ser igual ao total da conta", { duration: 1600 });
      return;
    }
    fecharContaBalcao(balcaoPedidoSelecionado, { usuario: currentOperator, pagamentos: balcaoPayments, troco: trocoRegistrado, desconto: descontoAplicado, cpfNota: cpfNotaBalcao.trim() || undefined });
    const trocoFinal = trocoRegistrado;
    toast.success(
      trocoFinal > 0
        ? `Conta fechada — Troco: ${formatPrice(trocoFinal)}`
        : balcaoPayments.length > 1
          ? "Conta fechada com múltiplas formas de pagamento"
          : `Conta fechada em ${getPaymentMethodLabel(balcaoPayments[0].formaPagamento)}`,
      { duration: 2500, icon: "✅" },
    );
    handleVoltar();
  };

  const handleSelecionarBalcao = (pedidoId: string) => {
    setMesaSelecionada(null);
    setBalcaoPedidoSelecionado(pedidoId);
    setBalcaoPayments([]);
    setBalcaoPaymentMethod("dinheiro");
    setBalcaoPaymentValue("");
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


  /* ── turno close handler ── */
  const handleCloseTurno = async () => {
    if (!turnoManagerName.trim()) { setTurnoError("Informe o nome do gerente"); return; }
    if (!/^\d{4,6}$/.test(turnoManagerPin)) { setTurnoError("PIN inválido"); return; }
    setIsClosingTurno(true);
    setTurnoError(null);
    const result = await verifyManagerAccess(turnoManagerName, turnoManagerPin);
    if (!result.ok) { setTurnoError(result.error ?? "Não autorizado"); setIsClosingTurno(false); return; }

    // Save counted cash as next shift's fund
    const contadoFinal = parseCurrencyInput(dinheiroContado);

    // Calculate and log diff
    const esperado = fundoTroco + resumoFinanceiro.dinheiro + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas;
    const diff = Number.isFinite(contadoFinal) ? contadoFinal - esperado : 0;
    const diffLabel = diff === 0 ? "caixa conferido" : diff > 0 ? `sobra de ${formatPrice(diff)}` : `falta de ${formatPrice(Math.abs(diff))}`;

    // Pass diferença data to estado_caixa via fecharCaixaDoDia
    const extras: { diferenca_dinheiro?: number; diferenca_motivo?: string; fundo_proximo?: number } = {};
    if (Number.isFinite(diff) && diff !== 0) {
      extras.diferenca_dinheiro = diff;
      extras.diferenca_motivo = motivoDiferenca.trim() || "Não informado";
    }
    if (Number.isFinite(contadoFinal) && contadoFinal > 0) {
      extras.fundo_proximo = contadoFinal;
    }

    fecharCaixaDoDia(currentOperator, Object.keys(extras).length > 0 ? extras : undefined);
    // Clear operator shift tracking
    try { localStorage.removeItem("obsidian-caixa-operadores-v1"); } catch {}
    
    // motoboy fechamentos now managed in Supabase
    setTurnoModalOpen(false);
    setIsClosingTurno(false);
    setTurnoManagerName("");
    setTurnoManagerPin("");
    setMotivoDiferenca("");

    if (diff !== 0) {
      toast[diff > 0 ? "success" : "error"](
        `Fechamento registrado com ${diffLabel}. Registrado no log.`,
        { duration: 3000 }
      );
    } else {
      toast.success("Turno fechado com sucesso!", { duration: 1400, icon: "🔒" });
    }
  };

  const clockStr = currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const dismissAviso = async () => {
    try {
    const storeId = getActiveStoreId();
      if (storeId) {
        await supabase.from("restaurant_config").update({ aviso_master: { ...masterAviso, lido: true } as any }).eq("store_id", storeId);
      }
    } catch {}
    setMasterAviso(null);
  };

  const avisoColors: Record<string, string> = {
    info: "bg-blue-600/20 border-blue-500/50 text-blue-300",
    alerta: "bg-yellow-600/20 border-yellow-500/50 text-yellow-300",
    urgente: "bg-destructive/20 border-destructive/50 text-destructive",
  };

  /* filtrarPedidos & renderCardDelivery moved to CaixaDeliveryPanel */

  return (
    <>
      <div className="h-svh flex flex-col bg-background overflow-hidden">
        {/* Master aviso banner */}
        {masterAviso && (
          <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b text-sm font-semibold ${avisoColors[masterAviso.tipo] || avisoColors.info}`}>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 shrink-0" />
              <span>{masterAviso.mensagem}</span>
            </div>
            {avisoCanDismiss && (
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={dismissAviso}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {!avisoCanDismiss && <span className="text-[10px] opacity-70 shrink-0">Aguarde 60s</span>}
          </div>
        )}
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
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
                {/* Info da mesa */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tabular-nums text-foreground">{formatPrice(mesa.total)}</span>
                  <StatusBadge status={mesa.status} />
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    {currentOperator.nome}
                  </div>
                </div>

                {/* Ações secundárias — menu recolhido */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl font-bold gap-1.5">
                        <MoreHorizontal className="h-4 w-4" />
                        Opções
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {mesa.pedidos.length > 0 && (
                        <DropdownMenuItem onClick={() => {
                          const allItens = mesa.pedidos.flatMap((p) => p.itens);
                          handlePrintComanda({
                            tipo: `Mesa ${String(mesa.numero).padStart(2, "0")}`,
                            numero: mesa.pedidos[mesa.pedidos.length - 1].numeroPedido,
                            dataHora: new Date().toLocaleString("pt-BR"),
                            itens: allItens.map((it) => ({ quantidade: it.quantidade, nome: it.nome, preco: it.precoUnitario })),
                            subtotal: mesa.total,
                            total: mesa.total,
                            paraViagem: mesa.pedidos.some((p) => p.paraViagem),
                          });
                        }}>
                          <Printer className="h-4 w-4 mr-2" /> Imprimir comanda
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setComandaOpen(true)}>
                        <ShoppingCart className="h-4 w-4 mr-2" /> Adicionar itens
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMesaTab("historico")}>
                        <ReceiptText className="h-4 w-4 mr-2" /> Ver histórico
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openCriticalAction({ type: "zerar_mesa", mesaId: mesa.id, mesaNumero: mesa.numero })}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Zerar mesa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Botão principal */}
                  <Button
                    size="sm"
                    disabled={!hasSomethingToClose}
                    onClick={() => setMesaTab("pagamento")}
                    className="rounded-xl font-black gap-1.5"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Fechar conta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BALCÃO DETAIL header ── */}
        {!mesa && balcaoPedido && (
          <div className="view-fade-in contents">
            <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 shrink-0 md:px-6">
              <button onClick={handleVoltar} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-colors hover:bg-secondary/80">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-black tracking-tight text-foreground truncate flex-1">
                {balcaoPedido.origem === "delivery" ? "DELIVERY" : "BALCÃO"} — {balcaoPedido.clienteNome || "Sem nome"}
              </h1>
              <Button variant="outline" onClick={() => logout(accessMode)} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </header>
            <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 md:px-6">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black tabular-nums text-foreground">{formatPrice(balcaoPedido.total)}</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    balcaoPedido.statusBalcao === "pronto"
                      ? "border-status-consumo/25 bg-status-consumo/10 text-status-consumo animate-pulse"
                      : balcaoPedido.statusBalcao === "saiu"
                      ? "border-blue-500/25 bg-blue-500/10 text-blue-400"
                      : balcaoPedido.statusBalcao === "entregue"
                      ? "border-muted bg-muted/30 text-muted-foreground"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                  }`}>
                    {balcaoPedido.statusBalcao === "pronto" ? "Pronto" : balcaoPedido.statusBalcao === "saiu" ? `Saiu — ${balcaoPedido.motoboyNome || ""}` : balcaoPedido.statusBalcao === "entregue" ? "Entregue" : "Aberto"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{currentOperator.nome}</span>
                </div>
                <div className="ml-auto">
                  <Button variant="outline" size="sm" onClick={() => {
                    const tipo = balcaoPedido.origem === "delivery"
                      ? `Delivery — ${balcaoPedido.clienteNome || ""}`
                      : `Balcão — ${balcaoPedido.clienteNome || ""}`;
                    handlePrintComanda({
                      tipo,
                      numero: balcaoPedido.numeroPedido,
                      dataHora: new Date().toLocaleString("pt-BR"),
                      itens: balcaoPedido.itens.map((it) => ({ quantidade: it.quantidade, nome: it.nome, preco: it.precoUnitario })),
                      subtotal: balcaoPedido.itens.reduce((s, it) => s + it.precoUnitario * it.quantidade, 0),
                      taxaEntrega: (balcaoPedido as any).taxaEntrega,
                      total: balcaoPedido.total,
                      formaPagamento: balcaoPedido.formaPagamentoDelivery ? getPaymentMethodLabel(balcaoPedido.formaPagamentoDelivery as PaymentMethod) : undefined,
                      paraViagem: (balcaoPedido as any).paraViagem === true,
                      origem: balcaoPedido.origem,
                      clienteNome: balcaoPedido.clienteNome,
                      endereco: balcaoPedido.enderecoCompleto,
                    });
                  }} className="rounded-xl font-bold gap-1.5">
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-hidden">
          {!mesa && !balcaoPedido ? (
            /* ─────────────── MAIN VIEW — PROFESSIONAL DESKTOP ─────────────── */
            <div className="flex flex-col h-full view-fade-in">

              <CaixaHeader
                caixaAberto={caixaAberto}
                operadorNome={currentOperator.nome}
                nomeRestaurante={sistemaConfig.nomeRestaurante || "Orderly"}
                accessMode={accessMode}
                onLogout={() => logout(accessMode)}
                onOpenMovimentacao={() => setMovModalOpen(true)}
                onOpenTurnoReport={() => setTurnoReportOpen(true)}
                onOpenBuscaComanda={() => setBuscaComandaOpen(true)}
                onOpenQrScanner={() => { setQrScanOpen(true); setQrScanInput(""); }}
                onOpenBalcao={() => setBalcaoOpen(true)}
                isAdminAccess={isAdminAccess}
              />

              {/* ── Windows-style Tabs ── */}
              <div className="flex items-end px-3 pt-1 shrink-0 bg-card">
                {showMesasTab && (
                <button
                  onClick={() => setCaixaView("mesas")}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors border border-border rounded-t -mb-px relative ${
                    caixaView === "mesas"
                      ? "bg-card text-foreground border-b-card z-10"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  Mesas
                </button>
                )}
                {showDeliveryTab && (
                <button
                  onClick={() => setCaixaView("delivery")}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors border border-border rounded-t -mb-px relative flex items-center gap-1.5 ${
                    caixaView === "delivery"
                      ? "bg-card text-foreground border-b-card z-10"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  Delivery
                  {(pedidosDeliveryAtivos.length + pedidosAguardandoConfirmacao.length) > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none bg-red-600 text-white ${pedidosAguardandoConfirmacao.length > 0 ? "animate-pulse" : ""}`}>{pedidosDeliveryAtivos.length + pedidosAguardandoConfirmacao.length}</span>
                  )}
                </button>
                )}
                {showTotemTab && (
                <button
                  onClick={() => setCaixaView("totem")}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors border border-border rounded-t -mb-px relative flex items-center gap-1.5 ${
                    caixaView === "totem"
                      ? "bg-card text-foreground border-b-card z-10"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  🖥️ Totem
                  {pedidosTotemAtivos.length > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none bg-orange-500 text-white">{pedidosTotemAtivos.length}</span>
                  )}
                </button>
                )}
                {showIfoodTab && (
                <button
                  onClick={() => setCaixaView("ifood")}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors border border-border rounded-t -mb-px relative flex items-center gap-1.5 ${
                    caixaView === "ifood"
                      ? "bg-card text-foreground border-b-card z-10"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  🔴 iFood
                </button>
                )}
                <button
                  onClick={() => setCaixaView("historico")}
                  className={`px-4 py-1.5 text-xs font-bold transition-colors border border-border rounded-t -mb-px relative flex items-center gap-1.5 ${
                    caixaView === "historico"
                      ? "bg-card text-foreground border-b-card z-10"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  📋 Histórico
                  {fechamentos.length > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none bg-primary text-primary-foreground">{fechamentos.length}</span>
                  )}
                </button>
                <div className="flex-1 border-b border-border" />
              </div>

              {/* ── Content Area ── */}
              <div className="flex flex-1 overflow-hidden border-t border-border">

                {/* ═══ Full-width content ═══ */}
                <div className="flex-1 overflow-y-auto p-5 lg:p-6 scrollbar-hide bg-background">
                {caixaView === "mesas" ? (
                  <CaixaMesasTab
                    mesas={mesas}
                    pedidosBalcaoSoAtivos={pedidosBalcaoSoAtivos}
                    onSelectMesa={handleSelecionarMesa}
                    onSelectBalcao={handleSelecionarBalcao}
                    currentTime={currentTime}
                  />
                ) : caixaView === "delivery" ? (
                  <CaixaDeliveryPanel
                    pedidosDeliveryAtivos={pedidosDeliveryAtivos}
                    pedidosAguardandoConfirmacao={pedidosAguardandoConfirmacao}
                    pedidosParaRetirar={pedidosParaRetirar}
                    pedidosEmRota={pedidosEmRota}
                    pedidosEntregues={pedidosEntregues}
                    pedidosDevolvidos={pedidosDevolvidos}
                    motoboyAtivos={motoboyAtivos}
                    fechamentosPendentes={fechamentosPendentes}
                    setFechamentoSelecionado={setFechamentoSelecionado}
                    setPinConferencia={setPinConferencia}
                    setPinConferenciaErro={setPinConferenciaErro}
                    filtroMotoboy={filtroMotoboy}
                    setFiltroMotoboy={setFiltroMotoboy}
                    mostrarEntregues={mostrarEntregues}
                    setMostrarEntregues={setMostrarEntregues}
                    buscaDelivery={buscaDelivery}
                    setBuscaDelivery={setBuscaDelivery}
                    bairrosCache={bairrosCache}
                    confirmTempoId={confirmTempoId}
                    setConfirmTempoId={setConfirmTempoId}
                    confirmTempo={confirmTempo}
                    setConfirmTempo={setConfirmTempo}
                    confirmTempoCustom={confirmTempoCustom}
                    setConfirmTempoCustom={setConfirmTempoCustom}
                    confirmTaxaEntrega={confirmTaxaEntrega}
                    setConfirmTaxaEntrega={setConfirmTaxaEntrega}
                    sistemaConfig={sistemaConfig}
                    confirmarPedidoBalcao={confirmarPedidoBalcao}
                    marcarBalcaoPronto={marcarBalcaoPronto}
                    rejeitarPedidoBalcao={rejeitarPedidoBalcao}
                    handleSelecionarBalcao={handleSelecionarBalcao}
                    setRejectDialogOpen={setRejectDialogOpen}
                    setRejectPedidoId={setRejectPedidoId}
                    setRejectMotivo={setRejectMotivo}
                    setBalcaoTipo={setBalcaoTipo}
                    setBalcaoOpen={setBalcaoOpen}
                  />
                ) : (
                  <CaixaTotemPanel
                    pedidosTotem={pedidosTotem}
                    pedidosTotemAtivos={pedidosTotemAtivos}
                    isFastFoodGlobal={isFastFoodGlobal}
                    pedidosAguardandoConfirmacao={pedidosAguardandoConfirmacao}
                    marcarBalcaoRetirado={marcarBalcaoRetirado}
                    cancelarPedidoBalcao={cancelarPedidoBalcao}
                    verifyEmployeeAccess={verifyEmployeeAccess}
                    currentCaixa={currentCaixa}
                    currentGerente={currentGerente}
                    setCaixaView={setCaixaView}
                    totemCancelOpen={totemCancelOpen}
                    setTotemCancelOpen={setTotemCancelOpen}
                    totemCancelMotivo={totemCancelMotivo}
                    setTotemCancelMotivo={setTotemCancelMotivo}
                    totemCancelPin={totemCancelPin}
                    setTotemCancelPin={setTotemCancelPin}
                    totemCancelError={totemCancelError}
                    setTotemCancelError={setTotemCancelError}
                    totemCancelLoading={totemCancelLoading}
                    setTotemCancelLoading={setTotemCancelLoading}
                  />
                )}
                {caixaView === "ifood" && (
                  <div className="space-y-4 fade-in p-1">
                    <IfoodPainel />
                  </div>
                )}
                {caixaView === "historico" && (
                  <CaixaHistoricoTab
                    fechamentos={fechamentos}
                    allFechamentos={allFechamentos}
                  />
                )}
                </div>

              </div>

              {/* ── Windows-style Status Bar ── */}
              <CaixaStatusBar
                currentOperatorNome={currentOperator.nome}
                caixaOpenTime={caixaOpenTime}
                mesasConsumo={mesasConsumo}
                mesasLivre={mesasLivre}
                fechamentosCount={fechamentos.length}
                ultimoFechamento={fechamentos.length > 0 ? (() => {
                  const f = fechamentos[0];
                  const id = f.mesaId || "";
                  if (id.includes("delivery")) return "Delivery";
                  if (id.includes("balcao") || f.mesaNumero === 0) return "Balcão";
                  return `Mesa ${String(f.mesaNumero).padStart(2, "0")}`;
                })() : "—"}
                moduloMesas={moduloMesas}
                showDeliveryTab={showDeliveryTab}
                pedidosAguardando={pedidosAguardandoConfirmacao.length}
                onGoToDelivery={() => setCaixaView("delivery")}
              />
            </div>
          ) : mesa ? (
            <CaixaMesaDetail
              mesa={mesa}
              mesaTab={mesaTab}
              setMesaTab={setMesaTab}
              closingPayments={closingPayments}
              closingPaymentMethod={closingPaymentMethod}
              setClosingPaymentMethod={setClosingPaymentMethod}
              closingPaymentValue={closingPaymentValue}
              setClosingPaymentValue={setClosingPaymentValue}
              trocoRegistrado={trocoRegistrado}
              descontoAplicado={descontoAplicado}
              setDescontoAplicado={setDescontoAplicado}
              couvertPessoas={couvertPessoas}
              setCouvertPessoas={setCouvertPessoas}
              couvertDispensado={couvertDispensado}
              setCouvertDispensado={setCouvertDispensado}
              cpfNotaMesa={cpfNotaMesa}
              setCpfNotaMesa={setCpfNotaMesa}
              cpfNotaMesaOpen={cpfNotaMesaOpen}
              setCpfNotaMesaOpen={setCpfNotaMesaOpen}
              setDescontoModalOpen={setDescontoModalOpen}
              totalConta={totalConta}
              couvertTotal={couvertTotal}
              valorRestante={valorRestante}
              fechamentoPronto={fechamentoPronto}
              totalPago={totalPago}
              paymentProgress={paymentProgress}
              couvertValorUnit={couvertValorUnit}
              sistemaConfig={sistemaConfig}
              currentOperator={currentOperator}
              fechamentosDaMesa={fechamentosDaMesa}
              handleFechar={handleFechar}
              handleAddPayment={handleAddPayment}
              handleRemovePayment={handleRemovePayment}
              openCriticalAction={openCriticalAction}
              ajustarItemPedido={ajustarItemPedido}
              setEstornoFechamentoId={setEstornoFechamentoId}
              setEstornoModalOpen={setEstornoModalOpen}
            />
          ) : balcaoPedido ? (
            <CaixaBalcaoDetail
              balcaoPedido={balcaoPedido}
              balcaoPayments={balcaoPayments}
              setBalcaoPayments={setBalcaoPayments}
              balcaoPaymentMethod={balcaoPaymentMethod}
              setBalcaoPaymentMethod={setBalcaoPaymentMethod}
              balcaoPaymentValue={balcaoPaymentValue}
              setBalcaoPaymentValue={setBalcaoPaymentValue}
              balcaoValorEntregue={balcaoValorEntregue}
              setBalcaoValorEntregue={setBalcaoValorEntregue}
              cpfNotaBalcao={cpfNotaBalcao}
              setCpfNotaBalcao={setCpfNotaBalcao}
              cpfNotaBalcaoOpen={cpfNotaBalcaoOpen}
              setCpfNotaBalcaoOpen={setCpfNotaBalcaoOpen}
              balcaoTotalConta={balcaoTotalConta}
              balcaoValorRestante={balcaoValorRestante}
              balcaoFechamentoPronto={balcaoFechamentoPronto}
              balcaoTotalPago={balcaoTotalPago}
              balcaoPaymentProgress={balcaoPaymentProgress}
              balcaoValorEntregueNum={balcaoValorEntregueNum}
              balcaoTrocoCalculado={balcaoTrocoCalculado}
              sistemaConfig={sistemaConfig}
              currentOperator={currentOperator}
              handleFecharBalcao={handleFecharBalcao}
              handleAddBalcaoPayment={handleAddBalcaoPayment}
              setTrocoRegistrado={setTrocoRegistrado}
            />
          ) : null}
        </main>
      </div>

      <CaixaDialogs
        criticalAction={criticalAction}
        resetCriticalDialog={resetCriticalDialog}
        criticalManagerName={criticalManagerName}
        setCriticalManagerName={setCriticalManagerName}
        criticalManagerPin={criticalManagerPin}
        setCriticalManagerPin={setCriticalManagerPin}
        criticalReason={criticalReason}
        setCriticalReason={setCriticalReason}
        criticalError={criticalError}
        isAuthorizingCriticalAction={isAuthorizingCriticalAction}
        getCriticalActionCopy={getCriticalActionCopy}
        handleConfirmCriticalAction={handleConfirmCriticalAction}
        turnoReportOpen={turnoReportOpen}
        setTurnoReportOpen={setTurnoReportOpen}
        turnoModalOpen={turnoModalOpen}
        setTurnoModalOpen={setTurnoModalOpen}
        turnoManagerName={turnoManagerName}
        setTurnoManagerName={setTurnoManagerName}
        turnoManagerPin={turnoManagerPin}
        setTurnoManagerPin={setTurnoManagerPin}
        turnoError={turnoError}
        setTurnoError={setTurnoError}
        isClosingTurno={isClosingTurno}
        dinheiroContado={dinheiroContado}
        setDinheiroContado={setDinheiroContado}
        motivoDiferenca={motivoDiferenca}
        setMotivoDiferenca={setMotivoDiferenca}
        isDesktop={isDesktop}
        resumoFinanceiro={resumoFinanceiro}
        fundoTroco={fundoTroco}
        caixaAberto={caixaAberto}
        caixaOpenTime={caixaOpenTime}
        clockStr={clockStr}
        pedidosBalcao={pedidosBalcao}
        fechamentos={fechamentos}
        movimentacoesCaixa={movimentacoesCaixa}
        resumoDeliveryTurno={resumoDeliveryTurno}
        handleCloseTurno={handleCloseTurno}
        accessMode={accessMode}
        currentOperatorNome={currentOperator.nome}
        movModalOpen={movModalOpen}
        setMovModalOpen={setMovModalOpen}
        movTipo={movTipo}
        setMovTipo={setMovTipo}
        movDescricao={movDescricao}
        setMovDescricao={setMovDescricao}
        movValor={movValor}
        setMovValor={setMovValor}
        movConfirmStep={movConfirmStep}
        setMovConfirmStep={setMovConfirmStep}
        handleRegistrarMovimentacao={handleRegistrarMovimentacao}
        balcaoOpen={balcaoOpen}
        balcaoFlowAtivo={balcaoFlowAtivo}
        onCloseBalcao={() => { setBalcaoOpen(false); setDeliveryStep("busca"); }}
        balcaoTipo={balcaoTipo}
        setBalcaoTipo={setBalcaoTipo}
        balcaoClienteNome={balcaoClienteNome}
        setBalcaoClienteNome={setBalcaoClienteNome}
        balcaoTelefone={balcaoTelefone}
        setBalcaoTelefone={setBalcaoTelefone}
        balcaoCpf={balcaoCpf}
        setBalcaoCpf={setBalcaoCpf}
        balcaoEndereco={balcaoEndereco}
        setBalcaoEndereco={setBalcaoEndereco}
        balcaoNumero={balcaoNumero}
        setBalcaoNumero={setBalcaoNumero}
        balcaoBairro={balcaoBairro}
        setBalcaoBairro={setBalcaoBairro}
        balcaoComplemento={balcaoComplemento}
        setBalcaoComplemento={setBalcaoComplemento}
        balcaoReferencia={balcaoReferencia}
        setBalcaoReferencia={setBalcaoReferencia}
        deliveryStep={deliveryStep}
        setDeliveryStep={setDeliveryStep}
        deliveryBusca={deliveryBusca}
        setDeliveryBusca={setDeliveryBusca}
        deliveryResultados={deliveryResultados}
        setDeliveryResultados={setDeliveryResultados}
        deliveryCep={deliveryCep}
        setDeliveryCep={setDeliveryCep}
        deliveryCepLoading={deliveryCepLoading}
        setDeliveryCepLoading={setDeliveryCepLoading}
        deliveryCepErro={deliveryCepErro}
        setDeliveryCepErro={setDeliveryCepErro}
        deliveryCidade={deliveryCidade}
        setDeliveryCidade={setDeliveryCidade}
        onOpenCardapio={() => setBalcaoFlowAtivo(true)}
        caixaStoreIdRef={caixaStoreIdRef}
        deliveryConfirmOpen={deliveryConfirmOpen}
        onCloseDeliveryConfirm={() => { setDeliveryConfirmOpen(false); setDeliveryPendingItens([]); }}
        deliveryPendingItens={deliveryPendingItens}
        sistemaConfig={sistemaConfig}
        balcaoFormaPag={balcaoFormaPag}
        setBalcaoFormaPag={setBalcaoFormaPag}
        balcaoTroco={balcaoTroco}
        setBalcaoTroco={setBalcaoTroco}
        deliveryTempoEstimado={deliveryTempoEstimado}
        setDeliveryTempoEstimado={setDeliveryTempoEstimado}
        handleDeliveryConfirm={handleDeliveryConfirm}
        onBackToCardapio={() => { setDeliveryConfirmOpen(false); setBalcaoFlowAtivo(true); }}
        rejectDialogOpen={rejectDialogOpen}
        rejectMotivo={rejectMotivo}
        setRejectMotivo={setRejectMotivo}
        onCloseReject={() => { setRejectDialogOpen(false); setRejectPedidoId(null); setRejectMotivo(""); }}
        onConfirmReject={() => {
          if (rejectPedidoId && rejectMotivo.trim()) {
            rejeitarPedidoBalcao(rejectPedidoId, rejectMotivo.trim());
            toast.success("Pedido rejeitado", { duration: 1400, icon: "❌" });
            setRejectDialogOpen(false);
            setRejectPedidoId(null);
            setRejectMotivo("");
          }
        }}
        fechamentoSelecionado={fechamentoSelecionado}
        setFechamentoSelecionado={setFechamentoSelecionado}
        pinConferencia={pinConferencia}
        setPinConferencia={setPinConferencia}
        pinConferenciaErro={pinConferenciaErro}
        setPinConferenciaErro={setPinConferenciaErro}
        verifyManagerAccess={verifyManagerAccess}
        currentOperator={currentOperator}
        registrarFechamentoMotoboy={registrarFechamentoMotoboy}
        setFechamentosPendentes={setFechamentosPendentes}
        descontoModalOpen={descontoModalOpen}
        onCloseDesconto={() => { setDescontoModalOpen(false); setDescontoError(null); }}
        descontoTipo={descontoTipo}
        setDescontoTipo={setDescontoTipo}
        descontoInput={descontoInput}
        setDescontoInput={setDescontoInput}
        descontoMotivo={descontoMotivo}
        setDescontoMotivo={setDescontoMotivo}
        descontoManagerName={descontoManagerName}
        setDescontoManagerName={setDescontoManagerName}
        descontoManagerPin={descontoManagerPin}
        setDescontoManagerPin={setDescontoManagerPin}
        descontoError={descontoError}
        mesaTotal={mesa?.total ?? 0}
        handleAplicarDesconto={handleAplicarDesconto}
        estornoModalOpen={estornoModalOpen}
        onCloseEstorno={() => { setEstornoModalOpen(false); setEstornoError(null); }}
        estornoMotivo={estornoMotivo}
        setEstornoMotivo={setEstornoMotivo}
        estornoNome={estornoNome}
        setEstornoNome={setEstornoNome}
        estornoPin={estornoPin}
        setEstornoPin={setEstornoPin}
        estornoError={estornoError}
        handleEstornar={handleEstornar}
        buscaComandaOpen={buscaComandaOpen}
        onCloseBuscaComanda={() => { setBuscaComandaOpen(false); setBuscaComanda(""); }}
        resultadosBusca={resultadosBusca}
        buscaComanda={buscaComanda}
        setBuscaComanda={setBuscaComanda}
        onEstornarFromBusca={(id) => { setEstornoFechamentoId(id); setEstornoModalOpen(true); }}
        qrScanOpen={qrScanOpen}
        onCloseQrScan={() => { setQrScanOpen(false); setQrScanInput(""); }}
        qrScanInput={qrScanInput}
        setQrScanInput={setQrScanInput}
        handleQrScan={handleQrScan}
      />

      <LicenseBanner context="operational" />

      {/* Atalhos de teclado - tooltip */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-muted/80 backdrop-blur text-[10px] text-muted-foreground font-mono tracking-wide pointer-events-none select-none">
        F2 Busca · F3 QR · F4 Balcão · F5 Delivery · Esc Voltar
      </div>
    </>
  );
};

export default CaixaPage;
