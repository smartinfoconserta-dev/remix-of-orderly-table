import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Loader2,
  Printer,
  Search,
  Banknote,
  Check,
  Clock,
  CreditCard,
  Landmark,
  LockKeyhole,
  LogOut,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
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
import { getSistemaConfig } from "@/lib/adminStorage";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import { findClienteDelivery, upsertClienteDelivery, getBairros, type ClienteDelivery } from "@/lib/deliveryStorage";

/* ── helpers ── */
const normStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const FECHAMENTOS_MOTOBOY_KEY = "obsidian-motoboy-fechamentos-v1";
const FUNDO_PROXIMO_KEY = "obsidian-caixa-fundo-proximo-v1";
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
  const [fundoTrocoInput, setFundoTrocoInput] = useState(() => {
    try {
      const saved = localStorage.getItem(FUNDO_PROXIMO_KEY);
      if (saved) {
        const val = parseFloat(saved);
        return Number.isFinite(val) ? val.toFixed(2).replace(".", ",") : "";
      }
    } catch {}
    return "";
  });
  const [turnoModalOpen, setTurnoModalOpen] = useState(false);
  const [turnoManagerName, setTurnoManagerName] = useState("");
  const [turnoManagerPin, setTurnoManagerPin] = useState("");
  const [turnoError, setTurnoError] = useState<string | null>(null);
  const [isClosingTurno, setIsClosingTurno] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida">("entrada");
  const [movDescricao, setMovDescricao] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movConfirmStep, setMovConfirmStep] = useState(false);
  const [turnoReportOpen, setTurnoReportOpen] = useState(false);
  const [dinheiroContado, setDinheiroContado] = useState("");
  const [motivoDiferenca, setMotivoDiferenca] = useState("");

  /* ── Balcão/Delivery state ── */
  const [balcaoOpen, setBalcaoOpen] = useState(false);
  const [balcaoTipo, setBalcaoTipo] = useState<"balcao" | "delivery">("balcao");
  const [balcaoClienteNome, setBalcaoClienteNome] = useState("");
  const [balcaoTelefone, setBalcaoTelefone] = useState("");
  const [balcaoEndereco, setBalcaoEndereco] = useState("");
  const [balcaoBairro, setBalcaoBairro] = useState("");
  const [balcaoReferencia, setBalcaoReferencia] = useState("");
  const [balcaoFormaPag, setBalcaoFormaPag] = useState<PaymentMethod>("dinheiro");
  const [balcaoTroco, setBalcaoTroco] = useState("");
  const [balcaoCpf, setBalcaoCpf] = useState("");
  const [balcaoNumero, setBalcaoNumero] = useState("");
  const [balcaoComplemento, setBalcaoComplemento] = useState("");
  const [deliveryBusca, setDeliveryBusca] = useState("");
  const [deliveryResultados, setDeliveryResultados] = useState<ClienteDelivery[]>([]);
  const [deliveryStep, setDeliveryStep] = useState<"busca" | "form">("busca");
  const [deliveryCep, setDeliveryCep] = useState("");
  const [deliveryCepLoading, setDeliveryCepLoading] = useState(false);
  const [deliveryCepErro, setDeliveryCepErro] = useState("");
  const [deliveryCidade, setDeliveryCidade] = useState("");
  const [balcaoPedidoSelecionado, setBalcaoPedidoSelecionado] = useState<string | null>(null);
  const [balcaoPayments, setBalcaoPayments] = useState<SplitPayment[]>([]);
  const [balcaoPaymentMethod, setBalcaoPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [balcaoPaymentValue, setBalcaoPaymentValue] = useState("");
  const [balcaoFlowAtivo, setBalcaoFlowAtivo] = useState(false);
  const [modoOperacao, setModoOperacao] = useState<"completo" | "somente_mesas" | "somente_delivery">("completo");
  const [caixaView, setCaixaView] = useState<"mesas" | "delivery">(() => {
    const savedModo = localStorage.getItem("obsidian-caixa-modo-v1");
    return savedModo === "somente_delivery" ? "delivery" : "mesas";
  });
  const [deliveryConfirmOpen, setDeliveryConfirmOpen] = useState(false);
  const [deliveryPendingItens, setDeliveryPendingItens] = useState<ItemCarrinho[]>([]);
  const [deliveryPendingParaViagem, setDeliveryPendingParaViagem] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectPedidoId, setRejectPedidoId] = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");
  const [confirmTempoId, setConfirmTempoId] = useState<string | null>(null);
  const [confirmTempo, setConfirmTempo] = useState("");
  const [confirmTempoCustom, setConfirmTempoCustom] = useState("");
  const [confirmTaxaEntrega, setConfirmTaxaEntrega] = useState("");
  const [buscaDelivery, setBuscaDelivery] = useState("");
  const [mostrarEntregues, setMostrarEntregues] = useState(false);
  const [filtroMotoboy, setFiltroMotoboy] = useState<string | null>(null);
  const [fechamentosPendentes, setFechamentosPendentes] = useState<any[]>([]);
  const [fechamentoSelecionado, setFechamentoSelecionado] = useState<any | null>(null);
  const [pinConferencia, setPinConferencia] = useState("");
  const [pinConferenciaErro, setPinConferenciaErro] = useState("");

  // Master aviso state
  const [masterAviso, setMasterAviso] = useState<{ mensagem: string; tipo: string; enviadoEm: string; lido: boolean } | null>(null);
  const [avisoCanDismiss, setAvisoCanDismiss] = useState(true);

  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const sistemaConfig = useMemo(() => getSistemaConfig(), []);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevAguardandoRef = useRef<number | null>(null);

  const mesa = mesaSelecionada ? mesas.find((item) => item.id === mesaSelecionada) ?? null : null;
  const balcaoPedido = balcaoPedidoSelecionado ? pedidosBalcao.find((p) => p.id === balcaoPedidoSelecionado) ?? null : null;
  const currentOperator = accessMode === "gerente" ? currentGerente : currentCaixa;
  const hasCaixaAccess = accessMode === "gerente"
    ? currentGerente?.role === "gerente" || currentGerente?.id === "seed-admin-001"
    : currentCaixa?.role === "caixa" || currentCaixa?.role === "gerente" || currentCaixa?.id === "seed-admin-001";

  useRouteLock(accessMode === "gerente" ? "/gerente" : "/caixa");

  // Load saved modo operacao
  useEffect(() => {
    const savedModo = localStorage.getItem("obsidian-caixa-modo-v1");
    if (savedModo === "somente_mesas" || savedModo === "somente_delivery" || savedModo === "completo") {
      setModoOperacao(savedModo);
    }
  }, []);

  // Poll motoboy fechamentos every 5s
  useEffect(() => {
    const ler = () => {
      try {
        const raw = localStorage.getItem(FECHAMENTOS_MOTOBOY_KEY);
        const lista = raw ? JSON.parse(raw) : [];
        setFechamentosPendentes(lista.filter((f: any) => f.status === "aguardando"));
      } catch {}
    };
    ler();
    const id = setInterval(ler, 5000);
    return () => clearInterval(id);
  }, []);

  const resumoDeliveryTurno = useMemo(() => {
    try {
      const raw = localStorage.getItem(FECHAMENTOS_MOTOBOY_KEY);
      const todos = raw ? JSON.parse(raw) : [];
      const doTurno = todos;
      const conferidos = doTurno.filter((f: any) => f.status === "conferido");
      const pendentes = doTurno.filter((f: any) => f.status === "aguardando");
      const totalConferido = conferidos.reduce((s: number, f: any) => s + (f.resumo?.totalAPrestar || 0), 0);
      const totalEntregas = conferidos.reduce((s: number, f: any) => s + (f.resumo?.totalEntregas || 0), 0);
      const motoboyNomes = [...new Set(doTurno.map((f: any) => f.motoboyNome))] as string[];
      return { conferidos: conferidos.length, pendentes: pendentes.length, totalConferido, totalEntregas, motoboyNomes };
    } catch { return { conferidos: 0, pendentes: 0, totalConferido: 0, totalEntregas: 0, motoboyNomes: [] as string[] }; }
  }, [caixaAberto, fechamentosPendentes]);


  useEffect(() => {
    const checkAviso = () => {
      try {
        const raw = localStorage.getItem("obsidian-master-aviso-v1");
        if (!raw) { setMasterAviso(null); return; }
        const aviso = JSON.parse(raw);
        if (aviso.lido) { setMasterAviso(null); return; }
        setMasterAviso(aviso);
        if (aviso.tipo === "urgente") {
          setAvisoCanDismiss(false);
          setTimeout(() => setAvisoCanDismiss(true), 60000);
        } else {
          setAvisoCanDismiss(true);
        }
      } catch { setMasterAviso(null); }
    };
    checkAviso();
    const id = setInterval(checkAviso, 30000);
    return () => clearInterval(id);
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
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 440;
          osc.type = "sine";
          gain.gain.value = 0.3;
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.35);
          osc.stop(ctx.currentTime + i * 0.35 + 0.3);
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

  /* ── payment math (mesa) ── */
  const totalConta = mesa?.total ?? 0;
  const totalContaCents = toCents(totalConta);
  const totalPago = useMemo(() => closingPayments.reduce((acc, p) => acc + p.valor, 0), [closingPayments]);
  const totalPagoCents = toCents(totalPago);
  const valorRestante = Math.max((totalContaCents - totalPagoCents) / 100, 0);
  const fechamentoPronto = totalContaCents > 0 && totalPagoCents === totalContaCents;
  const paymentProgress = totalContaCents > 0 ? Math.min(totalPagoCents / totalContaCents, 1) : 0;

  /* ── payment math (balcão) ── */
  const balcaoTotalConta = balcaoPedido?.total ?? 0;
  const balcaoTotalContaCents = toCents(balcaoTotalConta);
  const balcaoTotalPago = useMemo(() => balcaoPayments.reduce((acc, p) => acc + p.valor, 0), [balcaoPayments]);
  const balcaoTotalPagoCents = toCents(balcaoTotalPago);
  const balcaoValorRestante = Math.max((balcaoTotalContaCents - balcaoTotalPagoCents) / 100, 0);
  const balcaoFechamentoPronto = balcaoTotalContaCents > 0 && balcaoTotalPagoCents === balcaoTotalContaCents;
  const balcaoPaymentProgress = balcaoTotalContaCents > 0 ? Math.min(balcaoTotalPagoCents / balcaoTotalContaCents, 1) : 0;

  /* ── active balcão orders for grid ── */
  const pedidosBalcaoAtivos = useMemo(() => pedidosBalcao.filter((p) => p.statusBalcao !== "pago"), [pedidosBalcao]);
  const pedidosDeliveryAtivos = useMemo(() => pedidosBalcaoAtivos.filter((p) => p.origem === "delivery" && p.statusBalcao !== "aguardando_confirmacao"), [pedidosBalcaoAtivos]);
  const pedidosAguardandoConfirmacao = useMemo(() =>
    [...pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao === "aguardando_confirmacao")]
      .sort((a, b) => new Date(a.criadoEmIso).getTime() - new Date(b.criadoEmIso).getTime()),
    [pedidosBalcao]
  );
  const pedidosBalcaoSoAtivos = useMemo(() => pedidosBalcaoAtivos.filter((p) => p.origem === "balcao"), [pedidosBalcaoAtivos]);

  const pedidosParaRetirar = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "pronto" && !p.motoboyNome),
    [pedidosDeliveryAtivos]
  );
  const pedidosEmRota = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "saiu"),
    [pedidosDeliveryAtivos]
  );
  const pedidosDevolvidos = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "devolvido"),
    [pedidosDeliveryAtivos]
  );
  const pedidosEntregues = useMemo(() =>
    pedidosDeliveryAtivos.filter(p => p.statusBalcao === "entregue" || p.statusBalcao === "pago"),
    [pedidosDeliveryAtivos]
  );
  const motoboyAtivos = useMemo(() => {
    const map = new Map<string, { emRota: number; entregues: number }>();
    pedidosDeliveryAtivos.forEach(p => {
      if (!p.motoboyNome) return;
      const atual = map.get(p.motoboyNome) || { emRota: 0, entregues: 0 };
      if (p.statusBalcao === "saiu") atual.emRota++;
      if (p.statusBalcao === "entregue" || p.statusBalcao === "pago") atual.entregues++;
      map.set(p.motoboyNome, atual);
    });
    return [...map.entries()].map(([nome, dados]) => ({ nome, ...dados }));
  }, [pedidosDeliveryAtivos]);

  /* ── callbacks ── */
  const resetCloseAccountState = useCallback(() => {
    setClosingPayments([]);
    setClosingPaymentMethod("dinheiro");
    setClosingPaymentValue("");
  }, []);

  const handleVoltar = useCallback(() => {
    setComandaOpen(false);
    setMesaSelecionada(null);
    setBalcaoPedidoSelecionado(null);
    setMesaTab("comanda");
    resetCloseAccountState();
    setBalcaoPayments([]);
    setBalcaoPaymentMethod("dinheiro");
    setBalcaoPaymentValue("");
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

  /* ── Balcão/Delivery helpers ── */
  const resetBalcaoStates = useCallback(() => {
    setBalcaoFlowAtivo(false);
    setBalcaoOpen(false);
    setBalcaoTipo("balcao");
    setBalcaoClienteNome("");
    setBalcaoTelefone("");
    setBalcaoEndereco("");
    setBalcaoBairro("");
    setBalcaoReferencia("");
    setBalcaoFormaPag("dinheiro");
    setBalcaoTroco("");
    setBalcaoCpf("");
    setBalcaoNumero("");
    setBalcaoComplemento("");
    setDeliveryBusca("");
    setDeliveryResultados([]);
    setDeliveryStep("busca");
    setDeliveryCep("");
    setDeliveryCepLoading(false);
    setDeliveryCepErro("");
    setDeliveryCidade("");
  }, []);

  /* ── Print receipt helper (must be before early returns) ── */
  const handlePrintComanda = useCallback((data: {
    tipo: string;
    numero: number;
    dataHora: string;
    itens: Array<{ quantidade: number; nome: string; preco: number }>;
    subtotal: number;
    taxaEntrega?: number;
    total: number;
    formaPagamento?: string;
    paraViagem?: boolean;
  }) => {
    let el = document.getElementById("comanda-print");
    if (!el) {
      el = document.createElement("div");
      el.id = "comanda-print";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
    const taxaHtml = (data.taxaEntrega ?? 0) > 0
      ? `<div class="print-item"><span>Taxa de entrega</span><span>R$ ${data.taxaEntrega!.toFixed(2).replace(".", ",")}</span></div>`
      : "";
    const pagHtml = data.formaPagamento
      ? `<div class="print-center">${data.formaPagamento}</div>`
      : "";
    const paraLevarHtml = data.paraViagem
      ? `<div class="print-divider"></div><div class="print-center" style="font-size:18px;font-weight:900;letter-spacing:2px">*** PARA LEVAR — EMBALAR ***</div><div class="print-divider"></div>`
      : "";
    el.innerHTML = `
      <h2>${nomeRest}</h2>
      <div class="print-center">${data.tipo}</div>
      <div class="print-center">Pedido #${data.numero} — ${data.dataHora}</div>
      ${paraLevarHtml}
      <div class="print-divider"></div>
      ${data.itens.map((it) => `<div class="print-item"><span>${it.quantidade}x ${it.nome}</span><span>R$ ${(it.preco * it.quantidade).toFixed(2).replace(".", ",")}</span></div>`).join("")}
      <div class="print-divider"></div>
      <div class="print-item"><span>Subtotal</span><span>R$ ${data.subtotal.toFixed(2).replace(".", ",")}</span></div>
      ${taxaHtml}
      <div class="print-total"><span>TOTAL</span><span>R$ ${data.total.toFixed(2).replace(".", ",")}</span></div>
      <div class="print-divider"></div>
      ${pagHtml}
      <div class="print-center" style="margin-top:8px;font-size:10px">Obrigado pela preferência!</div>
    `;
    el.style.display = "block";
    window.print();
    el.style.display = "none";
  }, [sistemaConfig.nomeRestaurante]);
  const [qrRetiradaPedidoId, setQrRetiradaPedidoId] = useState<string | null>(null);
  const qrRetiradaTimerRef = useRef<number | null>(null);


  if (!currentOperator || !hasCaixaAccess) {
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
      localStorage.setItem("obsidian-caixa-modo-v1", modoOperacao);
      abrirCaixa(valor, currentOperator);
      localStorage.removeItem(FUNDO_PROXIMO_KEY);
      toast.success("Caixa aberto com sucesso!", { duration: 1200, icon: "✅" });
    };

    // If operator already opened, the abrirCaixa(0) above will re-render and skip this block
    if (!operadorJaAbriu) {
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
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Modo de operação</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "completo", label: "Completo", icon: "⊞", desc: "Mesas + Delivery" },
                    { value: "somente_mesas", label: "Só Mesas", icon: "🍽️", desc: "Sem delivery" },
                    { value: "somente_delivery", label: "Só Delivery", icon: "🛵", desc: "Sem mesas" },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setModoOperacao(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
                        modoOperacao === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs font-black">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
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

  function handleDeliveryConfirm() {
    upsertClienteDelivery({
      nome: balcaoClienteNome.trim(),
      cpf: balcaoCpf.trim(),
      telefone: balcaoTelefone.trim(),
      endereco: balcaoEndereco.trim(),
      numero: balcaoNumero.trim(),
      bairro: balcaoBairro.trim(),
      complemento: balcaoComplemento.trim(),
      referencia: balcaoReferencia.trim(),
    });
    criarPedidoBalcao({
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
      taxaEntrega: (() => {
        const bairrosDisp = getBairros().filter((b) => b.ativo);
        const match = balcaoBairro.trim() ? bairrosDisp.find((b) => normStr(b.nome) === normStr(balcaoBairro)) : null;
        return match ? match.taxa : 0;
      })(),
    });
    toast.success(`Pedido delivery enviado para ${balcaoClienteNome}`, { duration: 1600, icon: "🍽️" });
    setDeliveryConfirmOpen(false);
    setDeliveryPendingItens([]);
    resetBalcaoStates();
  }

  if (balcaoFlowAtivo) {
    const handleBalcaoConfirmado = (itens: ItemCarrinho[], paraViagem: boolean) => {
      if (balcaoTipo === "delivery") {
        setDeliveryPendingItens(itens);
        setDeliveryPendingParaViagem(paraViagem);
        setBalcaoFormaPag("dinheiro");
        setBalcaoTroco("");
        setBalcaoFlowAtivo(false);
        setDeliveryConfirmOpen(true);
        return;
      }
      criarPedidoBalcao({
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
      <PedidoFlow
        modo={balcaoTipo}
        clienteNome={balcaoClienteNome}
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
    fecharContaBalcao(balcaoPedidoSelecionado, { usuario: currentOperator, pagamentos: balcaoPayments });
    toast.success(
      balcaoPayments.length > 1
        ? "Conta fechada com múltiplas formas de pagamento"
        : `Conta fechada em ${getPaymentMethodLabel(balcaoPayments[0].formaPagamento)}`,
      { duration: 1400, icon: "✅" },
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
    // Clear operator shift tracking
    try { localStorage.removeItem("obsidian-caixa-operadores-v1"); } catch {}
    try { localStorage.removeItem("obsidian-caixa-modo-v1"); } catch {}
    try { localStorage.removeItem(FECHAMENTOS_MOTOBOY_KEY); } catch {}
    setTurnoModalOpen(false);
    setIsClosingTurno(false);
    setTurnoManagerName("");
    setTurnoManagerPin("");
    toast.success("Turno fechado com sucesso!", { duration: 1400, icon: "🔒" });
  };

  const clockStr = currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const dismissAviso = () => {
    try {
      const raw = localStorage.getItem("obsidian-master-aviso-v1");
      if (raw) {
        const aviso = JSON.parse(raw);
        aviso.lido = true;
        localStorage.setItem("obsidian-master-aviso-v1", JSON.stringify(aviso));
      }
    } catch {}
    setMasterAviso(null);
  };

  const avisoColors: Record<string, string> = {
    info: "bg-blue-600/20 border-blue-500/50 text-blue-300",
    alerta: "bg-yellow-600/20 border-yellow-500/50 text-yellow-300",
    urgente: "bg-destructive/20 border-destructive/50 text-destructive",
  };

  const filtrarPedidos = (lista: typeof pedidosDeliveryAtivos) => {
    let resultado = lista;
    if (filtroMotoboy) {
      resultado = resultado.filter(p => p.motoboyNome === filtroMotoboy);
    }
    if (buscaDelivery.trim()) {
      const q = buscaDelivery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      resultado = resultado.filter(p => {
        const nome = (p.clienteNome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const tel = (p.clienteTelefone || "").replace(/\D/g, "");
        return nome.includes(q) || tel.includes(q) || String(p.numeroPedido).includes(q);
      });
    }
    return resultado;
  };

  const renderCardDelivery = (pb: typeof pedidosBalcao[0]) => {
    const isPronto = pb.statusBalcao === "pronto";
    const isSaiu = pb.statusBalcao === "saiu";
    const isEntregue = pb.statusBalcao === "entregue";
    const isPago = pb.statusBalcao === "pago";
    const isDevolvido = pb.statusBalcao === "devolvido";
    const borderClass = isDevolvido
      ? "border-orange-500/60 bg-orange-500/8 ring-1 ring-orange-500/30 animate-pulse"
      : isPronto
      ? "border-emerald-500/60 bg-emerald-500/8 animate-pulse"
      : isSaiu
      ? "border-blue-500/50 bg-blue-500/8"
      : isEntregue || isPago
      ? "border-border/30 bg-card/40"
      : "border-amber-500/30 bg-amber-500/5";
    const badgeLabel = isDevolvido ? "⚠ Devolvido"
      : isPronto ? "Pronto p/ retirar"
      : isSaiu ? `Em rota — ${pb.motoboyNome || ""}`
      : isEntregue ? "Entregue"
      : isPago ? "Pago"
      : "Aguardando cozinha";
    const badgeClass = isDevolvido
      ? "border-orange-500/40 bg-orange-500/15 text-orange-400 font-black"
      : isPronto
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-black"
      : isSaiu
      ? "border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold"
      : isEntregue || isPago
      ? "border-border bg-secondary/50 text-muted-foreground"
      : "border-amber-500/25 bg-amber-500/10 text-amber-400";
    return (
      <div key={pb.id} className={`rounded-2xl border p-4 space-y-3 transition-colors ${borderClass}`}>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-foreground truncate">{pb.clienteNome || "—"}</p>
            {pb.enderecoCompleto && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{pb.enderecoCompleto}{pb.bairro ? ` — ${pb.bairro}` : ""}</span>
              </p>
            )}
            {pb.clienteTelefone && <p className="text-xs text-muted-foreground mt-0.5">{pb.clienteTelefone}</p>}
            {pb.motoboyNome && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm">🏍️</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                  isSaiu ? "bg-blue-500/15 text-blue-400 border-blue-500/25" : "bg-secondary text-muted-foreground border-border"
                }`}>{pb.motoboyNome}</span>
              </div>
            )}
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {pb.itens.slice(0, 3).map((it, idx) => (
            <p key={idx} className="truncate">{it.quantidade}× {it.nome}</p>
          ))}
          {pb.itens.length > 3 && <p className="text-muted-foreground/60">+{pb.itens.length - 3} itens...</p>}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-lg font-black tabular-nums text-foreground">{formatPrice(pb.total)}</span>
          <Button size="sm" variant="outline" onClick={() => handleSelecionarBalcao(pb.id)}
            className="rounded-xl font-bold gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" /> Ver comanda / Receber
          </Button>
        </div>
        {isDevolvido && (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
            <p className="text-xs font-black text-orange-400">⚠ Motoboy não conseguiu entregar</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => { marcarBalcaoPronto(pb.id); toast.success("Pedido voltou para fila"); }}>
                🔄 Reenviar
              </Button>
              <Button size="sm" variant="destructive" className="flex-1 rounded-xl text-xs font-bold"
                onClick={() => { rejeitarPedidoBalcao(pb.id, "Cancelado após devolução"); toast.error(`Pedido #${pb.numeroPedido} cancelado`); }}>
                ✕ Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
                  {mesa.pedidos.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => {
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
                    }} className="rounded-xl font-bold gap-1.5">
                      <Printer className="h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                  )}
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

              {/* ── Windows-style Title Bar ── */}
              <div className="flex items-center px-4 py-2 shrink-0" style={{ background: '#1e3a5f' }}>
                <p className="text-sm font-black text-white truncate">{sistemaConfig.nomeRestaurante || "Orderly"}</p>
                <div className="flex-1" />
                <p className="text-xs text-white/70">
                  {currentOperator.nome} • {accessMode === "gerente" ? "Acesso completo" : "Operador de caixa"}
                </p>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-white/70" />
                  <span className="text-sm font-black tabular-nums text-white">{clockStr}</span>
                </div>
              </div>

              {/* ── Windows-style Toolbar ── */}
              <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 shrink-0 bg-card">
                <button
                  onClick={() => setBalcaoOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 64 }}
                >
                  <ReceiptText className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Novo pedido</span>
                </button>
                <button
                  onClick={() => setMovModalOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 64 }}
                >
                  <Banknote className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Sangria</span>
                </button>
                <div className="w-px h-8 mx-1 bg-border" />
                <button
                  onClick={() => setTurnoReportOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-destructive/50 bg-secondary text-destructive hover:bg-destructive/15 transition-colors"
                  style={{ minWidth: 64 }}
                >
                  <LockKeyhole className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Fechar turno</span>
                </button>
                <button
                  onClick={() => logout(accessMode)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 64 }}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Sair</span>
                </button>
              </div>

              {/* ── Windows-style Tabs ── */}
              <div className="flex items-end px-3 pt-1 shrink-0 bg-card">
                {modoOperacao !== "somente_delivery" && (
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
                {modoOperacao !== "somente_mesas" && sistemaConfig.deliveryAtivo !== false && (
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
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums leading-none bg-red-600 text-white">{pedidosDeliveryAtivos.length + pedidosAguardandoConfirmacao.length}</span>
                  )}
                </button>
                )}
                <div className="flex-1 border-b border-border" />
              </div>

              {/* ── Content Area ── */}
              <div className="flex flex-1 overflow-hidden border-t border-border">

                {/* ═══ Full-width content ═══ */}
                <div className="flex-1 overflow-y-auto p-5 lg:p-6 scrollbar-hide bg-background">
                {caixaView === "mesas" ? (
                  <>
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
                    {/* ── Balcão cards only ── */}
                    {pedidosBalcaoSoAtivos.map((pb) => {
                      const isPronto = pb.statusBalcao === "pronto";
                      return (
                        <div key={pb.id} className="slide-up">
                          <button
                            onClick={() => handleSelecionarBalcao(pb.id)}
                            className={`relative flex min-h-[136px] w-full flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center mesa-card-interactive ${
                              isPronto
                                ? "border-status-consumo/50 bg-status-consumo/8 animate-pulse"
                                : "border-amber-500/50 bg-amber-500/8"
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                              Balcão
                            </span>
                            <span className="text-sm font-black text-foreground truncate max-w-full px-1">
                              {pb.clienteNome || "—"}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                              isPronto
                                ? "border-status-consumo/25 bg-status-consumo/10 text-status-consumo"
                                : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                            }`}>
                              {isPronto ? "Pronto" : "Aberto"}
                            </span>
                            {(pb as any).paraViagem === true && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400">
                                <ShoppingBag className="h-2.5 w-2.5" />
                                Para levar
                              </span>
                            )}
                            <span className="mt-1 text-sm font-black tabular-nums text-foreground">
                              {formatPrice(pb.total)}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  </>
                ) : (
                  /* ── DELIVERY PANEL ── */
                  <div className="space-y-4 fade-in">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-purple-400" />
                      <h2 className="text-base font-black text-foreground flex-1">Pedidos Delivery</h2>
                      <Button
                        size="sm"
                        onClick={() => { setBalcaoTipo("delivery"); setBalcaoOpen(true); }}
                        className="rounded-xl font-black gap-1.5 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Novo delivery
                      </Button>
                    </div>

                    {/* Fechamentos pendentes de motoboys */}
                    {fechamentosPendentes.length > 0 && (
                      <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/8 p-4 space-y-3">
                        <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                          {fechamentosPendentes.length} motoboy(s) solicitando fechamento
                        </h3>
                        <div className="space-y-2">
                          {fechamentosPendentes.map((f: any) => (
                            <button key={f.id} onClick={() => { setFechamentoSelecionado(f); setPinConferencia(""); setPinConferenciaErro(""); }}
                              className="w-full text-left rounded-xl border border-amber-500/25 bg-card p-3 hover:border-amber-500/60 transition-colors active:scale-[0.99]">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-black text-foreground">🏍️ {f.motoboyNome}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {f.resumo.totalEntregas} entregas · {new Date(f.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Total a prestar</p>
                                  <p className="text-xl font-black text-amber-400">R$ {f.resumo.totalAPrestar.toFixed(2)}</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Campo de busca */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou nº do pedido..."
                        value={buscaDelivery}
                        onChange={e => setBuscaDelivery(e.target.value)}
                        className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {buscaDelivery && (
                        <button onClick={() => setBuscaDelivery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Painel de motoboys ativos */}
                    {motoboyAtivos.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mr-1">🏍️ Motoboys:</span>
                        {filtroMotoboy && (
                          <button onClick={() => setFiltroMotoboy(null)}
                            className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" /> Todos
                          </button>
                        )}
                        {motoboyAtivos.map(m => (
                          <button
                            key={m.nome}
                            onClick={() => setFiltroMotoboy(filtroMotoboy === m.nome ? null : m.nome)}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                              filtroMotoboy === m.nome
                                ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                                : "border-border bg-card text-foreground hover:border-blue-500/30"
                            }`}
                          >
                            <span>{m.nome}</span>
                            {m.emRota > 0 && (
                              <span className="rounded-full bg-blue-500/20 text-blue-400 px-1.5 text-[10px] font-black">{m.emRota} rota</span>
                            )}
                            {m.entregues > 0 && (
                              <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 text-[10px] font-black">{m.entregues} ✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* SEÇÃO 1: Devolvidos — ação urgente */}
                    {filtrarPedidos(pedidosDevolvidos).length > 0 && (
                      <div className="space-y-3 mb-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-orange-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse inline-block" />
                          ⚠ Devolvidos — resolver agora ({filtrarPedidos(pedidosDevolvidos).length})
                        </h3>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {filtrarPedidos(pedidosDevolvidos).map(pb => renderCardDelivery(pb))}
                        </div>
                      </div>
                    )}

                    {/* SEÇÃO 2: Aguardando confirmação */}
                    {pedidosAguardandoConfirmacao.length > 0 && (
                      <div className="space-y-3 mb-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                          Aguardando confirmação ({pedidosAguardandoConfirmacao.length})
                        </h3>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {pedidosAguardandoConfirmacao.map((pb) => (
                            <div
                              key={pb.id}
                              className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/8 p-4 space-y-3 animate-pulse"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-black text-foreground truncate">{pb.clienteNome || "—"}</p>
                                {pb.enderecoCompleto && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{pb.enderecoCompleto}{pb.bairro ? ` — ${pb.bairro}` : ""}</span>
                                  </p>
                                )}
                                {pb.clienteTelefone && <p className="text-xs text-muted-foreground mt-0.5">{pb.clienteTelefone}</p>}
                                {(() => {
                                  const mins = Math.floor((Date.now() - new Date(pb.criadoEmIso).getTime()) / 60000);
                                  const cor = mins >= 15 ? "text-red-500 font-black animate-pulse" : mins >= 8 ? "text-amber-400 font-bold" : "text-muted-foreground";
                                  return (
                                    <p className={`text-xs flex items-center gap-1 mt-0.5 ${cor}`}>
                                      <Clock className="h-3 w-3 shrink-0" />
                                      Aguardando há {mins < 1 ? "menos de 1 min" : `${mins} min`}
                                    </p>
                                  );
                                })()}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {pb.itens.slice(0, 4).map((it, idx) => (
                                  <p key={idx} className="truncate">{it.quantidade}× {it.nome}</p>
                                ))}
                                {pb.itens.length > 4 && <p className="text-muted-foreground/60">+{pb.itens.length - 4} itens...</p>}
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                                <span className="text-lg font-black tabular-nums text-foreground">{formatPrice(pb.total)}</span>
                              </div>
                              {confirmTempoId === pb.id ? (
                                <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                                  <div className="space-y-1">
                                    <p className="text-xs font-black text-foreground">Taxa de entrega (R$)</p>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0,00"
                                      value={confirmTaxaEntrega}
                                      onChange={(e) => setConfirmTaxaEntrega(e.target.value)}
                                      className="h-8 text-xs rounded-lg"
                                    />
                                    {(() => {
                                      const bairros = getBairros().filter((b) => b.ativo);
                                      const bairroPedido = pb.bairro || "";
                                      const match = bairroPedido ? bairros.find((b) => normStr(b.nome) === normStr(bairroPedido)) : null;
                                      if (match && parseCurrencyInput(confirmTaxaEntrega) > 0) {
                                        return <p className="text-[10px] text-emerald-400 font-bold">Taxa automática — {match.nome}: {formatPrice(parseCurrencyInput(confirmTaxaEntrega))}</p>;
                                      }
                                      if (parseCurrencyInput(confirmTaxaEntrega) > 0) {
                                        return <p className="text-[10px] text-emerald-400 font-bold">Taxa: {formatPrice(parseCurrencyInput(confirmTaxaEntrega))}</p>;
                                      }
                                      if (!match && bairroPedido) {
                                        return <p className="text-[10px] text-amber-400 font-bold">Bairro "{bairroPedido}" sem taxa cadastrada</p>;
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <p className="text-xs font-black text-foreground">Tempo estimado de entrega</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {["20 min", "30 min", "45 min", "60 min"].map((t) => (
                                      <Button
                                        key={t}
                                        size="sm"
                                        variant={confirmTempo === t ? "default" : "outline"}
                                        className="rounded-lg text-xs h-7 px-2.5"
                                        onClick={() => { setConfirmTempo(t); setConfirmTempoCustom(""); }}
                                      >
                                        {t}
                                      </Button>
                                    ))}
                                  </div>
                                  <Input
                                    placeholder="Ou digite manualmente (ex: 50 min)"
                                    value={confirmTempoCustom}
                                    onChange={(e) => { setConfirmTempoCustom(e.target.value); setConfirmTempo(""); }}
                                    className="h-8 text-xs rounded-lg"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const taxaVal = parseCurrencyInput(confirmTaxaEntrega);
                                        const taxaFinal = Number.isFinite(taxaVal) && taxaVal > 0 ? taxaVal : 0;
                                        confirmarPedidoBalcao(pb.id, taxaFinal > 0 ? taxaFinal : undefined);
                                        toast.success(`Pedido #${pb.numeroPedido} confirmado!`, { duration: 1600, icon: "✅" });
                                        const tel = (pb.clienteTelefone || "").replace(/\D/g, "");
                                        if (tel) {
                                          const itensStr = pb.itens.map((it) => `${it.quantidade}x ${it.nome}`).join(", ");
                                          const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
                                          const tempoFinal = confirmTempoCustom.trim() || confirmTempo;
                                          let msg = `✅ Pedido %23${pb.numeroPedido} confirmado! — ${nomeRest}\n\n${itensStr}\n\nTotal: ${formatPrice(pb.total)}`;
                                          if (tempoFinal) msg += `\nPrevisão: ${tempoFinal}`;
                                          msg += `\n\nObrigado! 🍔`;
                                          window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, "_blank");
                                        }
                                        setConfirmTempoId(null);
                                        setConfirmTempo("");
                                        setConfirmTempoCustom("");
                                        setConfirmTaxaEntrega("");
                                      }}
                                      className="flex-1 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                      Confirmar com este tempo
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setConfirmTempoId(null); setConfirmTaxaEntrega(""); }} className="rounded-xl text-xs">
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setConfirmTempoId(pb.id);
                                      setConfirmTempo("");
                                      setConfirmTempoCustom("");
                                      const bairros = getBairros().filter((b) => b.ativo);
                                      const bairroPedido = pb.bairro || "";
                                      const match = bairroPedido ? bairros.find((b) => normStr(b.nome) === normStr(bairroPedido)) : null;
                                      setConfirmTaxaEntrega(match ? match.taxa.toFixed(2).replace(".", ",") : "");
                                    }}
                                    className="flex-1 rounded-xl font-black gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    ✅ Confirmar e avisar cliente
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => { setRejectPedidoId(pb.id); setRejectMotivo(""); setRejectDialogOpen(true); }}
                                    className="rounded-xl font-black gap-1.5"
                                  >
                                    ❌ Rejeitar
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SEÇÃO 3: Prontos para retirar */}
                    {filtrarPedidos(pedidosParaRetirar).length > 0 && (
                      <div className="space-y-3 mb-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                          Prontos p/ retirar ({filtrarPedidos(pedidosParaRetirar).length})
                        </h3>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {filtrarPedidos(pedidosParaRetirar).map(pb => renderCardDelivery(pb))}
                        </div>
                      </div>
                    )}

                    {/* SEÇÃO 4: Em rota */}
                    {filtrarPedidos(pedidosEmRota).length > 0 && (
                      <div className="space-y-3 mb-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
                          Em rota ({filtrarPedidos(pedidosEmRota).length})
                        </h3>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                          {filtrarPedidos(pedidosEmRota).map(pb => renderCardDelivery(pb))}
                        </div>
                      </div>
                    )}

                    {/* SEÇÃO 5: Entregues — colapsável */}
                    {pedidosEntregues.length > 0 && (
                      <div className="space-y-3">
                        <button
                          onClick={() => setMostrarEntregues(prev => !prev)}
                          className="w-full flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />
                            Entregues hoje ({pedidosEntregues.length})
                          </span>
                          <span>{mostrarEntregues ? "▲ Ocultar" : "▼ Ver histórico"}</span>
                        </button>
                        {mostrarEntregues && (
                          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 opacity-60">
                            {filtrarPedidos(pedidosEntregues).map(pb => renderCardDelivery(pb))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Estado vazio */}
                    {pedidosDeliveryAtivos.length === 0 && pedidosAguardandoConfirmacao.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                        <Truck className="h-12 w-12 opacity-20" />
                        <p className="text-sm font-semibold">Nenhum delivery ativo no momento</p>
                      </div>
                    )}
                  </div>
                )}
                </div>

              </div>

              {/* ── Windows-style Status Bar ── */}
              <div className="flex items-center shrink-0 divide-x divide-border text-[10px] bg-card border-t border-border text-muted-foreground">
                <span className="flex items-center gap-1.5 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Online
                </span>
                <span className="px-3 py-1.5 font-bold">
                  Operador: {currentOperator.nome}
                </span>
                {caixaOpenTime && (
                  <span className="px-3 py-1.5">
                    Turno: aberto {caixaOpenTime}
                  </span>
                )}
                {modoOperacao !== "somente_delivery" && (
                  <span className="px-3 py-1.5">Consumo: {mesasConsumo}</span>
                )}
                {modoOperacao !== "somente_delivery" && (
                  <span className="px-3 py-1.5">Livres: {mesasLivre}</span>
                )}
                <span className="px-3 py-1.5">Fechadas: {fechamentos.length}</span>
                <span className="px-3 py-1.5">
                  Último: {fechamentos.length > 0 ? (() => {
                    const f = fechamentos[0];
                    const id = f.mesaId || "";
                    if (id.includes("delivery")) return "Delivery";
                    if (id.includes("balcao") || f.mesaNumero === 0) return "Balcão";
                    return `Mesa ${String(f.mesaNumero).padStart(2, "0")}`;
                  })() : "—"}
                </span>
                {pedidosAguardandoConfirmacao.length > 0 && (
                  <button
                    onClick={() => setCaixaView("delivery")}
                    className="px-3 py-1.5 font-bold animate-pulse bg-amber-500/15 text-amber-500"
                  >
                    🛵 {pedidosAguardandoConfirmacao.length} delivery aguardando
                  </button>
                )}
              </div>
            </div>
          ) : mesa ? (
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

                {mesa.pedidos.some((p) => p.paraViagem) && (
                  <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-5 py-2.5">
                    <ShoppingBag className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-xs font-black text-amber-400">Este pedido é para levar — embale ao finalizar</p>
                  </div>
                )}

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

                  {mesa.pedidos.some((p) => p.paraViagem) && !fechamentoPronto && totalConta > 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
                      <ShoppingBag className="h-4 w-4 text-amber-400 shrink-0" />
                      <p className="text-xs font-bold text-amber-400">Lembrar: pedido para levar — verifique a embalagem</p>
                    </div>
                  )}

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
          ) : balcaoPedido ? (
            /* ─────────────── BALCÃO/DELIVERY DETAIL VIEW ─────────────── */
            <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[2fr_3fr] gap-5 p-4 md:p-6 fade-in">

              {/* ═══ LEFT: COMANDA ═══ */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-base font-black text-foreground flex items-center gap-2">
                    <ReceiptText className="h-4.5 w-4.5 text-primary" />
                    Comanda — {balcaoPedido.origem === "delivery" ? "Delivery" : "Balcão"}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  <div className="space-y-1">
                    <p className="px-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Pedido #{balcaoPedido.numeroPedido} • {balcaoPedido.clienteNome || "—"}
                    </p>
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-secondary/50">
                            <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">Qtd</th>
                            <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item</th>
                            <th className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">Preço</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {balcaoPedido.itens.map((item) => (
                            <tr key={item.uid} className="hover:bg-secondary/30 transition-colors">
                              <td className="py-2.5 px-3 tabular-nums text-muted-foreground font-semibold">{item.quantidade}</td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-foreground">{item.nome}</p>
                                {item.adicionais.length > 0 && <p className="text-xs text-primary mt-0.5">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>}
                                {item.removidos.length > 0 && <p className="text-xs text-destructive mt-0.5">Sem {item.removidos.join(", ")}</p>}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-bold text-foreground">{formatPrice(item.precoUnitario * item.quantidade)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {balcaoPedido.observacaoGeral && (
                    <p className="text-xs text-muted-foreground italic border-t border-border pt-2">Obs: {balcaoPedido.observacaoGeral}</p>
                  )}
                  {balcaoPedido.origem === "delivery" && (
                    <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1 text-xs">
                      <p className="font-black text-foreground">Dados do delivery</p>
                      {balcaoPedido.clienteTelefone && <p className="text-muted-foreground">Tel: {balcaoPedido.clienteTelefone}</p>}
                      {balcaoPedido.enderecoCompleto && <p className="text-muted-foreground">End: {balcaoPedido.enderecoCompleto}</p>}
                      {balcaoPedido.bairro && <p className="text-muted-foreground">Bairro: {balcaoPedido.bairro}</p>}
                      {balcaoPedido.referencia && <p className="text-muted-foreground">Ref: {balcaoPedido.referencia}</p>}
                    </div>
                  )}
                </div>

                <div className="border-t border-border px-5 py-4 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-foreground">Total</span>
                    <span className="text-xl font-black text-foreground tabular-nums">{formatPrice(balcaoPedido.total)}</span>
                  </div>
                </div>
              </div>

              {/* ═══ RIGHT: PAGAMENTO ═══ */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">Total da conta</span>
                      <span className="text-2xl font-black text-foreground tabular-nums">{formatPrice(balcaoTotalConta)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">Total pago</span>
                      <span className={`text-2xl font-black tabular-nums ${balcaoFechamentoPronto ? "text-status-consumo" : balcaoTotalPago > 0 ? "text-primary" : "text-foreground"}`}>
                        {formatPrice(balcaoTotalPago)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between rounded-2xl p-4 ${balcaoFechamentoPronto ? "bg-status-consumo/10" : "bg-destructive/5"}`}>
                      <span className={`text-base font-black ${balcaoFechamentoPronto ? "text-status-consumo" : "text-destructive"}`}>Restante</span>
                      <span className={`text-3xl font-black tabular-nums ${balcaoFechamentoPronto ? "text-status-consumo" : "text-destructive"}`}>
                        {balcaoFechamentoPronto ? (
                          <span className="flex items-center gap-2"><Check className="h-6 w-6" /> Quitado</span>
                        ) : formatPrice(balcaoValorRestante)}
                      </span>
                    </div>
                  </div>

                  <div className="relative rounded-full bg-secondary h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${balcaoPaymentProgress * 100}%`,
                        backgroundColor: balcaoFechamentoPronto
                          ? "hsl(var(--status-consumo))"
                          : balcaoPaymentProgress > 0
                            ? `hsl(${Math.round(balcaoPaymentProgress * 120)}, 70%, 45%)`
                            : "hsl(var(--destructive) / 0.4)",
                      }}
                    />
                  </div>

                  {!balcaoFechamentoPronto && balcaoTotalConta > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethodOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = balcaoPaymentMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setBalcaoPaymentMethod(opt.value)}
                            className={`flex items-center justify-center gap-3 rounded-2xl border-2 py-5 px-4 transition-colors ${
                              isSelected ? `border-white ${opt.bgColor}` : `${opt.idleBorder} ${opt.idleBg} opacity-50`
                            }`}
                          >
                            <Icon className={`h-7 w-7 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                            <span className={`text-lg font-black ${isSelected ? "text-white" : "text-muted-foreground"}`}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!balcaoFechamentoPronto && balcaoTotalConta > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Valor</label>
                          <Input value={balcaoPaymentValue} onChange={(e) => setBalcaoPaymentValue(e.target.value)} placeholder="Ex.: 25,00" inputMode="decimal" autoComplete="off" className="h-12 rounded-xl text-lg font-bold" />
                        </div>
                        <Button onClick={handleAddBalcaoPayment} className="rounded-xl font-black h-12 px-6 text-base">
                          <Plus className="h-5 w-5" /> Adicionar
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        {QUICK_VALUES.map((qv) => (
                          <Button key={qv} type="button" variant="outline" className="rounded-xl font-bold tabular-nums flex-1 h-10" disabled={qv > balcaoValorRestante} onClick={() => setBalcaoPaymentValue(qv.toFixed(2).replace(".", ","))}>
                            +R$ {qv}
                          </Button>
                        ))}
                        {balcaoValorRestante > 0 && !QUICK_VALUES.includes(Math.round(balcaoValorRestante * 100) / 100) && (
                          <Button type="button" variant="outline" className="rounded-xl font-bold tabular-nums flex-1 h-10 border-primary/30 text-primary hover:bg-primary/10" onClick={() => setBalcaoPaymentValue(balcaoValorRestante.toFixed(2).replace(".", ","))}>
                            Restante
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {balcaoPayments.length > 0 && (
                    <div className="space-y-2">
                      {balcaoPayments.map((payment) => {
                        const style = getPaymentMethodStyle(payment.formaPagamento);
                        const Icon = style.icon;
                        return (
                          <div key={payment.id} className={`flex items-center gap-3 rounded-2xl border ${style.borderColor} ${style.bgColor} px-4 py-3`}>
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bgColor} ${style.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <p className="flex-1 text-sm font-bold text-foreground">{getPaymentMethodLabel(payment.formaPagamento)}</p>
                            <span className={`text-base font-black tabular-nums ${style.color}`}>{formatPrice(payment.valor)}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setBalcaoPayments((prev) => prev.filter((p) => p.id !== payment.id))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-5 bg-card space-y-2">
                  <Button
                    onClick={handleFecharBalcao}
                    disabled={!balcaoFechamentoPronto || balcaoPayments.length === 0}
                    className={`w-full h-14 rounded-2xl text-lg font-black transition-all ${
                      balcaoFechamentoPronto
                        ? "bg-status-consumo text-white hover:bg-status-consumo/90 shadow-[0_0_20px_hsl(var(--status-consumo)/0.3)]"
                        : ""
                    }`}
                  >
                    {balcaoFechamentoPronto ? <ShieldCheck className="h-5 w-5" /> : <Check className="h-5 w-5" />}
                    Confirmar fechamento
                  </Button>
                  {!balcaoFechamentoPronto && balcaoTotalConta > 0 && (
                    <p className="text-center text-xs text-muted-foreground">O fechamento só será liberado quando o total pago for exatamente igual ao total da conta.</p>
                  )}
                </div>
              </div>

            </div>
          ) : null}
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

      {isDesktop ? (
        /* ── TURNO REPORT — FULLSCREEN DESKTOP ── */
        turnoReportOpen && (
          <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
            <header className="flex items-center gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
              <ReceiptText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black text-foreground flex-1">Relatório do turno</h2>
              <p className="text-sm text-muted-foreground">Confira o resumo antes de fechar o turno.</p>
              <button onClick={() => setTurnoReportOpen(false)} className="ml-4 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {paymentMethodOptions.map((pm) => {
                    const val = resumoFinanceiro[pm.value as keyof typeof resumoFinanceiro] as number;
                    return (
                      <div key={pm.value} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${pm.bgColor} ${pm.color}`}>
                          {(() => { const Icon = pm.icon; return <Icon className="h-5 w-5" />; })()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">{pm.label}</p>
                          <p className={`text-lg font-black tabular-nums ${pm.color}`}>{formatPrice(val)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sangrias (saídas)</span><span className="font-black tabular-nums text-destructive">{formatPrice(resumoFinanceiro.saidas)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Suprimentos (entradas)</span><span className="font-black tabular-nums text-emerald-400">{formatPrice(resumoFinanceiro.entradasExtras)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fundo de troco inicial</span><span className="font-black tabular-nums text-foreground">{formatPrice(fundoTroco)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Comandas fechadas</span><span className="font-black tabular-nums text-foreground">{fechamentos.length}</span></div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-black text-foreground text-base">Total líquido em caixa</span>
                    <span className="font-black tabular-nums text-primary text-xl">{formatPrice(fundoTroco + resumoFinanceiro.totalDia + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas)}</span>
                  </div>
                </div>
                {/* Cash reconciliation */}
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h3 className="text-base font-black text-foreground">Conferência de caixa</h3>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-muted-foreground">Dinheiro contado em caixa (R$)</label>
                    <Input value={dinheiroContado} onChange={(e) => setDinheiroContado(e.target.value)} placeholder="0,00" inputMode="decimal" className="text-lg font-black h-12 rounded-xl max-w-xs" />
                  </div>
                  {(() => {
                    const contado = parseCurrencyInput(dinheiroContado);
                    const esperado = fundoTroco + resumoFinanceiro.dinheiro + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas;
                    if (!Number.isFinite(contado)) return null;
                    const diff = contado - esperado;
                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Total esperado em dinheiro</span>
                          <span className="font-black tabular-nums">{formatPrice(esperado)}</span>
                        </div>
                        <div className={`flex justify-between items-center rounded-lg p-3 ${diff === 0 ? "bg-emerald-500/10" : diff > 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                          <span className="text-sm font-black">{diff === 0 ? "Caixa conferido ✓" : diff > 0 ? "Sobra de caixa" : "Falta de caixa"}</span>
                          <span className={`text-sm font-black tabular-nums ${diff === 0 ? "text-emerald-400" : diff > 0 ? "text-emerald-400" : "text-destructive"}`}>
                            {diff === 0 ? "R$ 0,00" : diff > 0 ? `+${formatPrice(diff)}` : formatPrice(diff)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {/* Delivery do turno */}
                {(() => {
                  const deliveryPedidos = pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao !== "aguardando_confirmacao");
                  if (deliveryPedidos.length === 0) return null;
                  const entregues = deliveryPedidos.filter(p => p.statusBalcao === "entregue" || p.statusBalcao === "pago");
                  const devolvidos = deliveryPedidos.filter(p => p.statusBalcao === "devolvido");
                  const emAberto = deliveryPedidos.filter(p => p.statusBalcao === "saiu" || p.statusBalcao === "pronto" || p.statusBalcao === "aberto");
                  const totalDelivery = entregues.reduce((s, p) => s + p.total, 0);
                  const dinheiroDelivery = entregues.filter((p) => p.formaPagamentoDelivery === "dinheiro").reduce((s, p) => s + p.total, 0);
                  const outrosDelivery = totalDelivery - dinheiroDelivery;
                  return (
                    <div className="rounded-xl border border-border bg-card p-6 space-y-3 text-sm">
                      <h3 className="text-base font-black text-foreground flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" /> Delivery do turno
                      </h3>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pedidos entregues</span><span className="font-black tabular-nums text-foreground">{entregues.length}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Total delivery</span><span className="font-black tabular-nums text-primary">{formatPrice(totalDelivery)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Em dinheiro (motoboy presta contas)</span><span className="font-black tabular-nums text-amber-400">{formatPrice(dinheiroDelivery)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">PIX/cartão (já liquidado)</span><span className="font-black tabular-nums text-emerald-400">{formatPrice(outrosDelivery)}</span></div>
                      {devolvidos.length > 0 && (
                        <div className="flex justify-between"><span className="text-orange-400">Devolvidos sem entrega</span><span className="font-bold tabular-nums text-orange-400">{devolvidos.length}</span></div>
                      )}
                      {emAberto.length > 0 && (
                        <div className="flex justify-between"><span className="text-amber-400">Ainda em rota / aguardando</span><span className="font-bold tabular-nums text-amber-400">{emAberto.length}</span></div>
                      )}
                    </div>
                  );
                })()}
                {resumoDeliveryTurno.totalEntregas > 0 && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 space-y-3">
                    <p className="text-sm font-black text-blue-400 flex items-center gap-1.5">
                      🏍️ Fechamentos de motoboys
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entregas realizadas</span>
                        <span className="font-bold">{resumoDeliveryTurno.totalEntregas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fechamentos conferidos</span>
                        <span className="font-bold text-emerald-400">{resumoDeliveryTurno.conferidos}</span>
                      </div>
                      {resumoDeliveryTurno.pendentes > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-400 font-bold">⚠ Aguardando conferência</span>
                          <span className="font-black text-amber-400">{resumoDeliveryTurno.pendentes}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-blue-500/20 pt-1.5">
                        <span className="font-bold text-foreground">Total delivery conferido</span>
                        <span className="font-black tabular-nums text-blue-400">{formatPrice(resumoDeliveryTurno.totalConferido)}</span>
                      </div>
                      {resumoDeliveryTurno.motoboyNomes.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Motoboys ativos</span>
                          <span className="font-bold text-right">{resumoDeliveryTurno.motoboyNomes.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Aberto: {caixaOpenTime || "—"}</span>
                  <span>Agora: {clockStr}</span>
                </div>
              </div>
            </div>
            <footer className="border-t border-border bg-card px-8 py-4 flex items-center justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setTurnoReportOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button variant="destructive" onClick={() => { setTurnoReportOpen(false); setTurnoModalOpen(true); setTurnoManagerName(accessMode === "gerente" ? currentOperator.nome : ""); setTurnoManagerPin(""); setTurnoError(null); }} className="rounded-xl font-black">
                Prosseguir com fechamento
              </Button>
            </footer>
          </div>
        )
      ) : (
        /* ── TURNO REPORT — MOBILE DIALOG ── */
        <Dialog open={turnoReportOpen} onOpenChange={setTurnoReportOpen}>
          <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-primary" />
                Relatório do turno
              </DialogTitle>
              <DialogDescription>Confira o resumo antes de fechar o turno.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {paymentMethodOptions.map((pm) => {
                  const val = resumoFinanceiro[pm.value as keyof typeof resumoFinanceiro] as number;
                  return (
                    <div key={pm.value} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${pm.bgColor} ${pm.color}`}>
                        {(() => { const Icon = pm.icon; return <Icon className="h-4 w-4" />; })()}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">{pm.label}</p>
                        <p className={`text-sm font-black tabular-nums ${pm.color}`}>{formatPrice(val)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Sangrias (saídas)</span><span className="font-black tabular-nums text-destructive">{formatPrice(resumoFinanceiro.saidas)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Suprimentos (entradas)</span><span className="font-black tabular-nums text-emerald-400">{formatPrice(resumoFinanceiro.entradasExtras)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fundo de troco inicial</span><span className="font-black tabular-nums text-foreground">{formatPrice(fundoTroco)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Comandas fechadas</span><span className="font-black tabular-nums text-foreground">{fechamentos.length}</span></div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-black text-foreground">Total líquido em caixa</span>
                  <span className="font-black tabular-nums text-primary text-lg">{formatPrice(fundoTroco + resumoFinanceiro.totalDia + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="text-sm font-black text-foreground">Conferência de caixa</h3>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Dinheiro contado em caixa (R$)</label>
                  <Input value={dinheiroContado} onChange={(e) => setDinheiroContado(e.target.value)} placeholder="0,00" inputMode="decimal" className="text-lg font-black h-12 rounded-xl" />
                </div>
                {(() => {
                  const contado = parseCurrencyInput(dinheiroContado);
                  const esperado = fundoTroco + resumoFinanceiro.dinheiro + resumoFinanceiro.entradasExtras - resumoFinanceiro.saidas;
                  if (!Number.isFinite(contado)) return null;
                  const diff = contado - esperado;
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total esperado em dinheiro</span>
                        <span className="font-black tabular-nums">{formatPrice(esperado)}</span>
                      </div>
                      <div className={`flex justify-between items-center rounded-lg p-2 ${diff === 0 ? "bg-emerald-500/10" : diff > 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        <span className="text-sm font-black">{diff === 0 ? "Caixa conferido ✓" : diff > 0 ? "Sobra de caixa" : "Falta de caixa"}</span>
                        <span className={`text-sm font-black tabular-nums ${diff === 0 ? "text-emerald-400" : diff > 0 ? "text-emerald-400" : "text-destructive"}`}>
                          {diff === 0 ? "R$ 0,00" : diff > 0 ? `+${formatPrice(diff)}` : formatPrice(diff)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const deliveryPedidos = pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao !== "aguardando_confirmacao");
                if (deliveryPedidos.length === 0) return null;
                const entregues = deliveryPedidos.filter(p => p.statusBalcao === "entregue" || p.statusBalcao === "pago");
                const devolvidos = deliveryPedidos.filter(p => p.statusBalcao === "devolvido");
                const emAberto = deliveryPedidos.filter(p => p.statusBalcao === "saiu" || p.statusBalcao === "pronto" || p.statusBalcao === "aberto");
                const totalDelivery = entregues.reduce((s, p) => s + p.total, 0);
                const dinheiroDelivery = entregues.filter((p) => p.formaPagamentoDelivery === "dinheiro").reduce((s, p) => s + p.total, 0);
                const outrosDelivery = totalDelivery - dinheiroDelivery;
                return (
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" /> Delivery do turno
                    </h3>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pedidos entregues</span><span className="font-black tabular-nums text-foreground">{entregues.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total delivery</span><span className="font-black tabular-nums text-primary">{formatPrice(totalDelivery)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Em dinheiro (motoboy)</span><span className="font-black tabular-nums text-amber-400">{formatPrice(dinheiroDelivery)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">PIX/cartão</span><span className="font-black tabular-nums text-emerald-400">{formatPrice(outrosDelivery)}</span></div>
                    {devolvidos.length > 0 && (
                      <div className="flex justify-between"><span className="text-orange-400">Devolvidos</span><span className="font-bold tabular-nums text-orange-400">{devolvidos.length}</span></div>
                    )}
                    {emAberto.length > 0 && (
                      <div className="flex justify-between"><span className="text-amber-400">Em rota</span><span className="font-bold tabular-nums text-amber-400">{emAberto.length}</span></div>
                    )}
                  </div>
                );
              })()}
              {resumoDeliveryTurno.totalEntregas > 0 && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                  <p className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                    🏍️ Fechamentos de motoboys
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entregas realizadas</span>
                      <span className="font-bold">{resumoDeliveryTurno.totalEntregas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fechamentos conferidos</span>
                      <span className="font-bold text-emerald-400">{resumoDeliveryTurno.conferidos}</span>
                    </div>
                    {resumoDeliveryTurno.pendentes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-400 font-bold">⚠ Aguardando conferência</span>
                        <span className="font-black text-amber-400">{resumoDeliveryTurno.pendentes}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-blue-500/20 pt-1">
                      <span className="font-bold text-foreground">Total delivery conferido</span>
                      <span className="font-black tabular-nums text-blue-400">{formatPrice(resumoDeliveryTurno.totalConferido)}</span>
                    </div>
                    {resumoDeliveryTurno.motoboyNomes.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Motoboys ativos</span>
                        <span className="font-bold text-right">{resumoDeliveryTurno.motoboyNomes.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Aberto: {caixaOpenTime || "—"}</span>
                <span>Agora: {clockStr}</span>
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" onClick={() => setTurnoReportOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button variant="destructive" onClick={() => { setTurnoReportOpen(false); setTurnoModalOpen(true); setTurnoManagerName(accessMode === "gerente" ? currentOperator.nome : ""); setTurnoManagerPin(""); setTurnoError(null); }} className="rounded-xl font-black">
                Prosseguir com fechamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {isDesktop ? (
        /* ── TURNO CLOSE — DESKTOP CENTERED CARD WITH BACKDROP ── */
        turnoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-foreground/80" onClick={() => { setTurnoModalOpen(false); setTurnoError(null); }} />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-black text-foreground flex-1">Fechar turno</h2>
                <button onClick={() => { setTurnoModalOpen(false); setTurnoError(null); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Autorização de gerente necessária para confirmar o fechamento.</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
                  <Input value={turnoManagerName} onChange={(e) => setTurnoManagerName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
                  <Input value={turnoManagerPin} onChange={(e) => setTurnoManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 a 6 dígitos" inputMode="numeric" autoComplete="one-time-code" onKeyDown={(e) => e.key === "Enter" && handleCloseTurno()} />
                </div>
                {turnoError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{turnoError}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setTurnoModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                <Button variant="destructive" onClick={handleCloseTurno} className="rounded-xl font-black" disabled={isClosingTurno}>
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        <Dialog open={turnoModalOpen} onOpenChange={(open) => { if (!open) { setTurnoModalOpen(false); setTurnoError(null); } }}>
          <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-destructive" />
                Fechar turno
              </DialogTitle>
              <DialogDescription>Autorização de gerente necessária para confirmar o fechamento.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
                <Input value={turnoManagerName} onChange={(e) => setTurnoManagerName(e.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
                <Input value={turnoManagerPin} onChange={(e) => setTurnoManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="4 a 6 dígitos" inputMode="numeric" autoComplete="one-time-code" onKeyDown={(e) => e.key === "Enter" && handleCloseTurno()} />
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
      )}

      {/* ── Movimentação Modal ── */}
      {isDesktop ? (
        /* ── DESKTOP RIGHT PANEL 480px ── */
        movModalOpen && (
          <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
            <div className="flex-1 bg-foreground/60" onClick={() => { setMovModalOpen(false); setMovConfirmStep(false); }} />
            <div className="w-[480px] h-screen bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
              <header className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
                <Banknote className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h2 className="text-base font-black text-foreground">Registrar movimentação</h2>
                  <p className="text-xs text-muted-foreground">Sangria (saída) ou suprimento (entrada) de valores no caixa.</p>
                </div>
                <button onClick={() => { setMovModalOpen(false); setMovConfirmStep(false); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80">
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {movConfirmStep ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-center space-y-1">
                      <p className="font-black text-foreground">Confirma {movTipo === "saida" ? "sangria" : "suprimento"} de {formatPrice(parseCurrencyInput(movValor) || 0)}?</p>
                      <p className="text-muted-foreground">Motivo: {movDescricao}</p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setMovConfirmStep(false)} className="rounded-xl font-bold">Voltar</Button>
                      <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Confirmar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Tipo</label>
                      <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as "entrada" | "saida")} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                        <option value="entrada">Suprimento (entrada)</option>
                        <option value="saida">Sangria (saída)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Motivo / Descrição *</label>
                      <Input value={movDescricao} onChange={(e) => setMovDescricao(e.target.value)} placeholder="Ex.: Troco para entrega, Reforço de caixa" maxLength={100} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Valor (R$) *</label>
                      <Input value={movValor} onChange={(e) => setMovValor(e.target.value)} placeholder="0,00" inputMode="decimal" className="text-lg font-black" onKeyDown={(e) => e.key === "Enter" && handleRegistrarMovimentacao()} />
                    </div>
                    {movimentacoesCaixa.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Últimas movimentações</p>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                          {movimentacoesCaixa.slice(0, 5).map((mov) => (
                            <div key={mov.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                              <span className={`font-black tabular-nums ${mov.tipo === "entrada" ? "text-emerald-400" : "text-destructive"}`}>{mov.tipo === "entrada" ? "Suprimento" : "Sangria"}</span>
                              <span className="font-black tabular-nums text-foreground">{formatPrice(mov.valor)}</span>
                              <span className="flex-1 truncate text-muted-foreground">{mov.descricao}</span>
                              <span className="tabular-nums text-muted-foreground/60">{mov.criadoEm}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!movConfirmStep && (
                <footer className="border-t border-border px-5 py-4 flex justify-end gap-3 shrink-0">
                  <Button variant="outline" onClick={() => setMovModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Registrar</Button>
                </footer>
              )}
            </div>
          </div>
        )
      ) : (
        <Dialog open={movModalOpen} onOpenChange={(open) => { if (!open) { setMovModalOpen(false); setMovConfirmStep(false); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar movimentação</DialogTitle>
              <DialogDescription>Sangria (saída) ou suprimento (entrada) de valores no caixa.</DialogDescription>
            </DialogHeader>
            {movConfirmStep ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-center space-y-1">
                  <p className="font-black text-foreground">Confirma {movTipo === "saida" ? "sangria" : "suprimento"} de {formatPrice(parseCurrencyInput(movValor) || 0)}?</p>
                  <p className="text-muted-foreground">Motivo: {movDescricao}</p>
                </div>
                <DialogFooter className="gap-3 sm:gap-0">
                  <Button variant="outline" onClick={() => setMovConfirmStep(false)} className="rounded-xl font-bold">Voltar</Button>
                  <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Confirmar</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Tipo</label>
                    <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as "entrada" | "saida")} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                      <option value="entrada">Suprimento (entrada)</option>
                      <option value="saida">Sangria (saída)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Motivo / Descrição *</label>
                    <Input value={movDescricao} onChange={(e) => setMovDescricao(e.target.value)} placeholder="Ex.: Troco para entrega, Reforço de caixa" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Valor (R$) *</label>
                    <Input value={movValor} onChange={(e) => setMovValor(e.target.value)} placeholder="0,00" inputMode="decimal" className="text-lg font-black" onKeyDown={(e) => e.key === "Enter" && handleRegistrarMovimentacao()} />
                  </div>
                  {movimentacoesCaixa.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Últimas movimentações</p>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                        {movimentacoesCaixa.slice(0, 5).map((mov) => (
                          <div key={mov.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                            <span className={`font-black tabular-nums ${mov.tipo === "entrada" ? "text-emerald-400" : "text-destructive"}`}>{mov.tipo === "entrada" ? "Suprimento" : "Sangria"}</span>
                            <span className="font-black tabular-nums text-foreground">{formatPrice(mov.valor)}</span>
                            <span className="flex-1 truncate text-muted-foreground">{mov.descricao}</span>
                            <span className="tabular-nums text-muted-foreground/60">{mov.criadoEm}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-3 sm:gap-0">
                  <Button variant="outline" onClick={() => setMovModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button onClick={handleRegistrarMovimentacao} className="rounded-xl font-black">Registrar</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── BALCÃO / DELIVERY ── */}
      {(() => {
        const balcaoFormContent = (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={balcaoTipo === "balcao" ? "default" : "outline"} onClick={() => { setBalcaoTipo("balcao"); setDeliveryStep("busca"); }} className="flex-1 rounded-xl font-black">Balcão</Button>
              <Button variant={balcaoTipo === "delivery" ? "default" : "outline"} onClick={() => { setBalcaoTipo("delivery"); setDeliveryStep("busca"); }} className="flex-1 rounded-xl font-black">Delivery</Button>
            </div>
            {balcaoTipo === "balcao" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nome do cliente *</label>
                <Input value={balcaoClienteNome} onChange={(e) => setBalcaoClienteNome(e.target.value)} placeholder="Nome do cliente" />
              </div>
            )}
            {balcaoTipo === "delivery" && deliveryStep === "busca" && (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <label className="text-xs font-semibold text-foreground">Buscar cliente por CPF ou Telefone</label>
                <div className="flex gap-2">
                  <Input value={deliveryBusca} onChange={(e) => setDeliveryBusca(e.target.value)} placeholder="CPF ou telefone..." onKeyDown={(e) => { if (e.key === "Enter") setDeliveryResultados(findClienteDelivery(deliveryBusca)); }} />
                  <Button size="sm" onClick={() => setDeliveryResultados(findClienteDelivery(deliveryBusca))} className="rounded-xl font-bold gap-1.5 shrink-0"><Search className="h-4 w-4" />Buscar</Button>
                </div>
                {deliveryResultados.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {deliveryResultados.slice(0, 5).map((cli) => (
                      <button key={cli.id} type="button" onClick={() => { setBalcaoClienteNome(cli.nome); setBalcaoCpf(cli.cpf); setBalcaoTelefone(cli.telefone); setBalcaoEndereco(cli.endereco); setBalcaoNumero(cli.numero); setBalcaoBairro(cli.bairro); setBalcaoComplemento(cli.complemento); setBalcaoReferencia(cli.referencia); setDeliveryStep("form"); }} className="w-full text-left rounded-xl border border-border bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                        <p className="text-sm font-bold text-foreground">{cli.nome}</p>
                        <p className="text-xs text-muted-foreground">{cli.telefone} {cli.endereco ? `— ${cli.endereco}, ${cli.numero}` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
                {deliveryBusca.trim() && deliveryResultados.length === 0 && (
                  <div className="text-center py-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Cliente não encontrado</p>
                    <Button size="sm" variant="outline" onClick={() => setDeliveryStep("form")} className="rounded-xl font-bold">Cadastrar novo cliente</Button>
                  </div>
                )}
                {!deliveryBusca.trim() && (
                  <Button size="sm" variant="ghost" onClick={() => setDeliveryStep("form")} className="w-full rounded-xl font-bold text-xs text-muted-foreground">Pular busca — cadastrar novo</Button>
                )}
              </div>
            )}
            {balcaoTipo === "delivery" && deliveryStep === "form" && (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Nome completo *</label><Input value={balcaoClienteNome} onChange={(e) => setBalcaoClienteNome(e.target.value)} placeholder="Nome completo" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Telefone *</label><Input value={balcaoTelefone} onChange={(e) => setBalcaoTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">CPF *</label><Input value={balcaoCpf} onChange={(e) => setBalcaoCpf(e.target.value)} placeholder="000.000.000-00" /></div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">CEP</label>
                  <div className="flex gap-2 items-center">
                    <Input value={deliveryCep} onChange={(e) => { let v = e.target.value.replace(/\D/g, "").slice(0, 8); if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5); setDeliveryCep(v); setDeliveryCepErro(""); const digits = v.replace(/\D/g, ""); if (digits.length === 8) { setDeliveryCepLoading(true); fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json()).then(data => { if (data.erro) { setDeliveryCepErro("CEP não encontrado"); } else { setBalcaoEndereco(data.logradouro || ""); setBalcaoBairro(data.bairro || ""); setDeliveryCidade(data.localidade ? `${data.localidade} - ${data.uf}` : ""); } }).catch(() => setDeliveryCepErro("Erro ao buscar CEP")).finally(() => setDeliveryCepLoading(false)); } }} placeholder="00000-000" className="flex-1" />
                    {deliveryCepLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>
                  {deliveryCepErro && <p className="text-xs text-destructive">{deliveryCepErro}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1"><label className="text-xs font-semibold text-foreground">Endereço / Rua *</label><Input value={balcaoEndereco} onChange={(e) => setBalcaoEndereco(e.target.value)} placeholder="Rua" /></div>
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Número *</label><Input value={balcaoNumero} onChange={(e) => setBalcaoNumero(e.target.value)} placeholder="Nº" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Bairro</label><Input value={balcaoBairro} onChange={(e) => setBalcaoBairro(e.target.value)} placeholder="Bairro" /></div>
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Cidade</label><Input value={deliveryCidade} readOnly={!!deliveryCidade} onChange={(e) => setDeliveryCidade(e.target.value)} placeholder="Cidade" className={deliveryCidade ? "bg-muted" : ""} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Complemento</label><Input value={balcaoComplemento} onChange={(e) => setBalcaoComplemento(e.target.value)} placeholder="Apto, bloco..." /></div>
                  <div className="space-y-1"><label className="text-xs font-semibold text-foreground">Referência</label><Input value={balcaoReferencia} onChange={(e) => setBalcaoReferencia(e.target.value)} placeholder="Próximo a..." /></div>
                </div>
              </div>
            )}
          </div>
        );

        const balcaoFooterButtons = (
          <>
            {balcaoTipo === "delivery" && deliveryStep === "form" && (
              <Button variant="ghost" onClick={() => setDeliveryStep("busca")} className="rounded-xl font-bold mr-auto">← Voltar</Button>
            )}
            <Button variant="outline" onClick={() => { setBalcaoOpen(false); setDeliveryStep("busca"); }} className="rounded-xl font-bold">Cancelar</Button>
            {(balcaoTipo === "balcao" || deliveryStep === "form") && (
              <Button
                disabled={balcaoTipo === "balcao" ? !balcaoClienteNome.trim() : !balcaoClienteNome.trim() || !balcaoTelefone.trim() || !balcaoCpf.trim() || !balcaoEndereco.trim() || !balcaoNumero.trim()}
                onClick={() => {
                  if (balcaoTipo === "balcao" && !balcaoClienteNome.trim()) { toast.error("Informe o nome do cliente", { duration: 1400 }); return; }
                  if (balcaoTipo === "delivery") {
                    if (!balcaoClienteNome.trim()) { toast.error("Informe o nome do cliente", { duration: 1400 }); return; }
                    if (!balcaoTelefone.trim()) { toast.error("Informe o telefone", { duration: 1400 }); return; }
                    if (!balcaoCpf.trim()) { toast.error("Informe o CPF do cliente", { duration: 1400 }); return; }
                    if (!balcaoEndereco.trim()) { toast.error("Informe o endereço", { duration: 1400 }); return; }
                    if (!balcaoNumero.trim()) { toast.error("Informe o número do endereço", { duration: 1400 }); return; }
                  }
                  setBalcaoFlowAtivo(true);
                }}
                className="rounded-xl font-black gap-1.5"
              >
                <ShoppingCart className="h-4 w-4" />
                {balcaoTipo === "delivery" ? "Salvar e abrir cardápio" : "Abrir cardápio"}
              </Button>
            )}
          </>
        );

        return isDesktop ? (
          (balcaoOpen && !balcaoFlowAtivo) && (
            <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
              <div className="flex-1 bg-foreground/60" onClick={() => { setBalcaoOpen(false); setDeliveryStep("busca"); }} />
              <div className="w-[520px] h-screen bg-background border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
                <header className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <h2 className="text-base font-black text-foreground">Pedido Balcão / Delivery</h2>
                    <p className="text-xs text-muted-foreground">Preencha os dados e abra o cardápio completo.</p>
                  </div>
                  <button onClick={() => { setBalcaoOpen(false); setDeliveryStep("busca"); }} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground hover:bg-secondary/80">
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-5">
                  {balcaoFormContent}
                </div>
                <footer className="border-t border-border px-5 py-4 flex items-center justify-end gap-3 shrink-0">
                  {balcaoFooterButtons}
                </footer>
              </div>
            </div>
          )
        ) : (
          <Dialog open={balcaoOpen && !balcaoFlowAtivo} onOpenChange={(open) => { if (!open) { setBalcaoOpen(false); setDeliveryStep("busca"); } }}>
            <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" />Pedido Balcão / Delivery</DialogTitle>
                <DialogDescription>Preencha os dados e abra o cardápio completo.</DialogDescription>
              </DialogHeader>
              {balcaoFormContent}
              <DialogFooter className="gap-3 sm:gap-0">
                {balcaoFooterButtons}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── DELIVERY CONFIRMATION DIALOG ── */}
      <Dialog open={deliveryConfirmOpen} onOpenChange={(open) => { if (!open) { setDeliveryConfirmOpen(false); setDeliveryPendingItens([]); } }}>
        <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-400" />
              Confirmar pedido delivery
            </DialogTitle>
            <DialogDescription>Revise o pedido antes de enviar para a cozinha.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resumo dos itens */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <p className="text-xs font-black text-foreground uppercase tracking-widest">Itens do pedido</p>
              {deliveryPendingItens.map((it, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-foreground">{it.quantidade}× {it.nome}</span>
                  <span className="font-bold tabular-nums text-foreground">{formatPrice(it.precoUnitario * it.quantidade)}</span>
                </div>
              ))}
              {(sistemaConfig.taxaEntrega ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span>{formatPrice(sistemaConfig.taxaEntrega!)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-sm font-black text-foreground">Total</span>
                <span className="text-lg font-black tabular-nums text-primary">{formatPrice(deliveryPendingItens.reduce((s, it) => s + it.precoUnitario * it.quantidade, 0) + (sistemaConfig.taxaEntrega ?? 0))}</span>
              </div>
            </div>

            {/* Endereço */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <p className="text-xs font-black text-foreground uppercase tracking-widest">Entrega</p>
              <p className="text-sm text-foreground">{balcaoClienteNome}</p>
              <p className="text-xs text-muted-foreground">{balcaoEndereco}{balcaoNumero ? `, ${balcaoNumero}` : ""}{balcaoBairro ? ` — ${balcaoBairro}` : ""}</p>
              {balcaoTelefone && <p className="text-xs text-muted-foreground">{balcaoTelefone}</p>}
            </div>

            {/* Pagamento */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              <p className="text-xs font-black text-foreground uppercase tracking-widest">Pagamento</p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Forma de pagamento</label>
                <select value={balcaoFormaPag} onChange={(e) => setBalcaoFormaPag(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>
              {balcaoFormaPag === "dinheiro" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Troco para quanto?</label>
                  <Input value={balcaoTroco} onChange={(e) => setBalcaoTroco(e.target.value)} placeholder="0,00" inputMode="decimal" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeliveryConfirmOpen(false); setBalcaoFlowAtivo(true); }} className="rounded-xl font-bold">← Voltar ao cardápio</Button>
            <Button onClick={handleDeliveryConfirm} className="rounded-xl font-black gap-1.5">
              <Check className="h-4 w-4" />
              Confirmar e enviar para cozinha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT DELIVERY DIALOG ── */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open) { setRejectDialogOpen(false); setRejectPedidoId(null); setRejectMotivo(""); } }}>
        <DialogContent className="rounded-2xl border-border bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Rejeitar pedido
            </DialogTitle>
            <DialogDescription>Informe o motivo da rejeição.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Motivo *</label>
              <Textarea
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                placeholder="Ex: Produto indisponível, endereço fora da área..."
                maxLength={200}
                className="min-h-[80px] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectPedidoId(null); }} className="rounded-xl font-bold">Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!rejectMotivo.trim() || !rejectPedidoId}
              onClick={() => {
                if (rejectPedidoId && rejectMotivo.trim()) {
                  rejeitarPedidoBalcao(rejectPedidoId, rejectMotivo.trim());
                  toast.success("Pedido rejeitado", { duration: 1400, icon: "❌" });
                  setRejectDialogOpen(false);
                  setRejectPedidoId(null);
                  setRejectMotivo("");
                }
              }}
              className="rounded-xl font-black"
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de conferência de fechamento de motoboy */}
      {fechamentoSelecionado && (
        <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-border bg-secondary/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conferência de fechamento</p>
              <p className="text-xl font-black text-foreground mt-1">🏍️ {fechamentoSelecionado.motoboyNome}</p>
              <p className="text-xs text-muted-foreground">
                {fechamentoSelecionado.resumo.totalEntregas} entregas · {new Date(fechamentoSelecionado.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
              <div className="rounded-xl bg-secondary/60 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">💵 Dinheiro físico</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recebido dos clientes</span>
                  <span className="font-bold tabular-nums">R$ {fechamentoSelecionado.resumo.dinheiroRecebido.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Troco devolvido</span>
                  <span className="font-bold tabular-nums text-destructive">- R$ {fechamentoSelecionado.resumo.trocoTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                  <span className="font-bold">Líquido dinheiro</span>
                  <span className="font-black tabular-nums">R$ {fechamentoSelecionado.resumo.liquidoDinheiro.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">+ Fundo de troco inicial</span>
                  <span className="font-bold tabular-nums">R$ {fechamentoSelecionado.resumo.fundoTroco.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                  <span className="font-black text-amber-400">Deve entregar em dinheiro</span>
                  <span className="font-black tabular-nums text-amber-400 text-base">R$ {fechamentoSelecionado.resumo.deveDevolver.toFixed(2)}</span>
                </div>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">📱 Pagamentos digitais</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PIX</span>
                  <span className="font-bold tabular-nums text-emerald-400">R$ {fechamentoSelecionado.resumo.pix.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cartão de crédito</span>
                  <span className="font-bold tabular-nums text-blue-400">R$ {fechamentoSelecionado.resumo.credito.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cartão de débito</span>
                  <span className="font-bold tabular-nums text-blue-400">R$ {fechamentoSelecionado.resumo.debito.toFixed(2)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/8 p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total geral a prestar</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Dinheiro + confirmação dos digitais</p>
                  </div>
                  <span className="text-2xl font-black tabular-nums text-primary">R$ {fechamentoSelecionado.resumo.totalAPrestar.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">PIN do gerente para confirmar:</p>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={pinConferencia}
                  onChange={e => { setPinConferencia(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinConferenciaErro(""); }}
                  className="text-center text-xl font-black h-12 rounded-xl tracking-widest"
                />
                {pinConferenciaErro && <p className="text-xs text-destructive font-bold text-center">{pinConferenciaErro}</p>}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold"
                onClick={() => { setFechamentoSelecionado(null); setPinConferencia(""); setPinConferenciaErro(""); }}>
                Cancelar
              </Button>
              <Button className="flex-1 h-11 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={async () => {
                  if (pinConferencia.length < 4) { setPinConferenciaErro("PIN inválido"); return; }
                  const nomeGerente = currentOperator?.nome || "";
                  const result = await verifyManagerAccess(nomeGerente, pinConferencia);
                  if (!result.ok) { setPinConferenciaErro("PIN incorreto ou sem permissão"); return; }

                  const f = fechamentoSelecionado;
                  registrarFechamentoMotoboy({
                    motoboyNome: f.motoboyNome,
                    motoboyId: f.motoboyId,
                    dinheiro: f.resumo.dinheiroRecebido,
                    troco: f.resumo.trocoTotal,
                    fundoTroco: f.resumo.fundoTroco,
                    pix: f.resumo.pix,
                    credito: f.resumo.credito,
                    debito: f.resumo.debito,
                    totalEntregas: f.resumo.totalEntregas,
                    pedidosIds: f.pedidosIds || [],
                    conferidoPor: nomeGerente,
                  });

                  // Mark as confirmed in localStorage
                  try {
                    const raw = localStorage.getItem(FECHAMENTOS_MOTOBOY_KEY);
                    const lista = raw ? JSON.parse(raw) : [];
                    const updated = lista.map((item: any) => item.id === f.id ? { ...item, status: "conferido" } : item);
                    localStorage.setItem(FECHAMENTOS_MOTOBOY_KEY, JSON.stringify(updated));
                    setFechamentosPendentes(updated.filter((item: any) => item.status === "aguardando"));
                  } catch {}

                  setFechamentoSelecionado(null);
                  setPinConferencia("");
                  toast.success(`Fechamento de ${f.motoboyNome} conferido! ✓`, { duration: 3000 });
                }}>
                ✓ Confirmar fechamento
              </Button>
            </div>
          </div>
        </div>
      )}

      <LicenseBanner blockMode={accessMode === "caixa"} />
    </>
  );
};

export default CaixaPage;
