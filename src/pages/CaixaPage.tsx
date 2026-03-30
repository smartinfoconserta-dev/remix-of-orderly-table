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
  MoreHorizontal,
  MessageCircle,
  QrCode,
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
import MesaCard from "@/components/MesaCard";

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
import { getActiveStoreId } from "@/lib/sessionManager";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import { findClienteDelivery, upsertClienteDelivery, getBairrosAsync, type Bairro, type ClienteDelivery } from "@/lib/deliveryStorage";
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
} from "@/components/caixa/caixaHelpers";
import CaixaDeliveryPanel from "@/components/caixa/CaixaDeliveryPanel";
import CaixaTotemPanel from "@/components/caixa/CaixaTotemPanel";
import CaixaMesaDetail from "@/components/caixa/CaixaMesaDetail";
import CaixaBalcaoDetail from "@/components/caixa/CaixaBalcaoDetail";
import CaixaTurnoReport from "@/components/caixa/CaixaTurnoReport";
import CaixaMovimentacaoDialog from "@/components/caixa/CaixaMovimentacaoDialog";
import CaixaMotoboyConferencia from "@/components/caixa/CaixaMotoboyConferencia";

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

  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [comandaOpen, setComandaOpen] = useState(false);
  const [mesaTab, setMesaTab] = useState<"comanda" | "pagamento" | "historico">("comanda");
  const [closingPayments, setClosingPayments] = useState<SplitPayment[]>([]);
  const [closingPaymentMethod, setClosingPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [closingPaymentValue, setClosingPaymentValue] = useState("");
  const [valorEntregue, setValorEntregue] = useState("");
  const [trocoRegistrado, setTrocoRegistrado] = useState(0);
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

  // Load fundo_proximo from estado_caixa
  useEffect(() => {
    const storeId = getActiveStoreId();
    if (!storeId) return;
    supabase.from("estado_caixa").select("fundo_proximo").eq("store_id", storeId).order("updated_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const val = Number(data?.[0]?.fundo_proximo ?? 0);
        if (val > 0) setFundoTrocoInput(val.toFixed(2).replace(".", ","));
      });
  }, []);
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
  const [descontoModalOpen, setDescontoModalOpen] = useState(false);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoInput, setDescontoInput] = useState("");
  const [descontoMotivo, setDescontoMotivo] = useState("");
  const [descontoManagerName, setDescontoManagerName] = useState("");
  const [descontoManagerPin, setDescontoManagerPin] = useState("");
  const [descontoError, setDescontoError] = useState<string | null>(null);
  const [descontoAplicado, setDescontoAplicado] = useState(0);
  const [couvertPessoas, setCouvertPessoas] = useState(0);
  const [couvertDispensado, setCouvertDispensado] = useState(false);
  const [cpfNotaMesa, setCpfNotaMesa] = useState("");
  const [cpfNotaMesaOpen, setCpfNotaMesaOpen] = useState(false);
  const [cpfNotaBalcao, setCpfNotaBalcao] = useState("");
  const [cpfNotaBalcaoOpen, setCpfNotaBalcaoOpen] = useState(false);
  const [estornoModalOpen, setEstornoModalOpen] = useState(false);
  const [estornoFechamentoId, setEstornoFechamentoId] = useState<string | null>(null);
  const [estornoMotivo, setEstornoMotivo] = useState("");
  const [estornoPin, setEstornoPin] = useState("");
  const [estornoNome, setEstornoNome] = useState("");
  const [estornoError, setEstornoError] = useState<string | null>(null);

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
  const [balcaoValorEntregue, setBalcaoValorEntregue] = useState("");
  const [balcaoFlowAtivo, setBalcaoFlowAtivo] = useState(false);
  const globalModulos = useMemo(() => getSistemaConfig()?.modulos ?? {}, []);
  const moduloMesas = globalModulos.mesas !== false;
  const moduloTotem = globalModulos.totem === true;
  const moduloBalcao = globalModulos.balcao === true;
  // isFastFoodGlobal backward compat: true when no mesas and has totem/balcao
  const isFastFoodGlobal = !moduloMesas && (moduloTotem || moduloBalcao);
  const [caixaView, setCaixaView] = useState<"mesas" | "delivery" | "totem" | "historico" | "ifood">(() => {
    if (moduloMesas) return "mesas";
    if (moduloTotem) return "totem";
    if (moduloBalcao) return "delivery";
    return "delivery";
  });
  const [totemCancelOpen, setTotemCancelOpen] = useState<string | null>(null);
  const [totemCancelMotivo, setTotemCancelMotivo] = useState("");
  const [totemCancelPin, setTotemCancelPin] = useState("");
  const [totemCancelError, setTotemCancelError] = useState<string | null>(null);
  const [totemCancelLoading, setTotemCancelLoading] = useState(false);
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
  const [deliveryTempoEstimado, setDeliveryTempoEstimado] = useState("");
  const [buscaDelivery, setBuscaDelivery] = useState("");
  const [bairrosCache, setBairrosCache] = useState<Bairro[]>([]);
  const caixaStoreIdRef = useRef<string | null>(null);
  useEffect(() => {
    const sid = getActiveStoreId();
    caixaStoreIdRef.current = sid;
    if (sid) getBairrosAsync(sid).then(setBairrosCache);
  }, []);
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
  const [buscaComanda, setBuscaComanda] = useState("");
  const [buscaComandaOpen, setBuscaComandaOpen] = useState(false);
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
  const adminOperator = isAdminAccess ? { id: "admin", nome: "Administrador", role: "caixa" as const, criadoEm: "" } : null;
  const currentOperator = adminOperator ?? (accessMode === "gerente" ? currentGerente : currentCaixa);
  const hasCaixaAccess = isAdminAccess || (accessMode === "gerente"
    ? currentGerente?.role === "gerente" || currentGerente?.id === "seed-admin-001"
    : currentCaixa?.role === "caixa" || currentCaixa?.role === "gerente" || currentCaixa?.role === "delivery" || currentCaixa?.id === "seed-admin-001");

  useRouteLock(accessMode === "gerente" ? "/gerente" : "/caixa");

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

  /* ── payment math (mesa) ── */
  const couvertValorUnit = sistemaConfig.couvertAtivo && !couvertDispensado && couvertPessoas > 0
    ? (sistemaConfig.couvertValor ?? 0)
    : 0;
  const couvertTotal = couvertValorUnit * couvertPessoas;
  const totalConta = Math.max((mesa?.total ?? 0) - descontoAplicado + couvertTotal, 0);
  const totalContaCents = toCents(totalConta);
  const totalPago = useMemo(() => closingPayments.reduce((acc, p) => acc + p.valor, 0), [closingPayments]);
  const totalPagoCents = toCents(totalPago);
  const valorRestante = Math.max((totalContaCents - totalPagoCents) / 100, 0);
  const fechamentoPronto = totalContaCents > 0 && totalPagoCents === totalContaCents;
  const paymentProgress = totalContaCents > 0 ? Math.min(totalPagoCents / totalContaCents, 1) : 0;
  const valorEntregueNum = parseCurrencyInput(valorEntregue);
  const valorEntregueValido = Number.isFinite(valorEntregueNum) && valorEntregueNum > 0;
  const trocoCalculado = closingPaymentMethod === "dinheiro" && Number.isFinite(valorEntregueNum) && valorEntregueNum > valorRestante
    ? valorEntregueNum - valorRestante : 0;
  const valorDinheiroARegistrar = Number.isFinite(valorEntregueNum) ? Math.min(valorEntregueNum, valorRestante) : 0;

  /* ── payment math (balcão) ── */
  const balcaoTotalConta = balcaoPedido?.total ?? 0;
  const balcaoTotalContaCents = toCents(balcaoTotalConta);
  const balcaoTotalPago = useMemo(() => balcaoPayments.reduce((acc, p) => acc + p.valor, 0), [balcaoPayments]);
  const balcaoTotalPagoCents = toCents(balcaoTotalPago);
  const balcaoValorRestante = Math.max((balcaoTotalContaCents - balcaoTotalPagoCents) / 100, 0);
  const balcaoFechamentoPronto = balcaoTotalContaCents > 0 && balcaoTotalPagoCents === balcaoTotalContaCents;
  const balcaoPaymentProgress = balcaoTotalContaCents > 0 ? Math.min(balcaoTotalPagoCents / balcaoTotalContaCents, 1) : 0;
  const balcaoValorEntregueNum = parseCurrencyInput(balcaoValorEntregue);
  const balcaoTrocoCalculado = balcaoPaymentMethod === "dinheiro" && Number.isFinite(balcaoValorEntregueNum) && balcaoValorEntregueNum > balcaoValorRestante
    ? balcaoValorEntregueNum - balcaoValorRestante : 0;

  /* ── active balcão orders for grid ── */
  const pedidosBalcaoAtivos = useMemo(() => pedidosBalcao.filter((p) => p.statusBalcao !== "pago"), [pedidosBalcao]);
  const pedidosDeliveryAtivos = useMemo(() => pedidosBalcaoAtivos.filter((p) => p.origem === "delivery" && p.statusBalcao !== "aguardando_confirmacao"), [pedidosBalcaoAtivos]);
  const pedidosAguardandoConfirmacao = useMemo(() =>
    [...pedidosBalcao.filter((p) => p.origem === "delivery" && p.statusBalcao === "aguardando_confirmacao")]
      .sort((a, b) => new Date(a.criadoEmIso).getTime() - new Date(b.criadoEmIso).getTime()),
    [pedidosBalcao]
  );
  const pedidosBalcaoSoAtivos = useMemo(() => pedidosBalcaoAtivos.filter((p) => p.origem === "balcao"), [pedidosBalcaoAtivos]);
  const pedidosTotem = useMemo(() =>
    pedidosBalcao.filter((p) => p.origem === "totem").sort((a, b) => new Date(b.criadoEmIso).getTime() - new Date(a.criadoEmIso).getTime()),
    [pedidosBalcao]
  );
  const pedidosTotemAtivos = useMemo(() => pedidosTotem.filter((p) => p.statusBalcao !== "cancelado" && p.statusBalcao !== "retirado"), [pedidosTotem]);

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
    setValorEntregue("");
    setTrocoRegistrado(0);
    setDescontoAplicado(0);
    setDescontoInput("");
    setDescontoMotivo("");
    setDescontoManagerName("");
    setDescontoManagerPin("");
    setDescontoError(null);
    setCouvertPessoas(0);
    setCouvertDispensado(false);
    setCpfNotaMesa("");
    setCpfNotaMesaOpen(false);
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
    setBalcaoValorEntregue("");
    setCpfNotaBalcao("");
    setCpfNotaBalcaoOpen(false);
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
    desconto?: number;
    couvert?: number;
    numeroPessoas?: number;
    origem?: string;
    clienteNome?: string;
    endereco?: string;
    cpfNota?: string;
  }) => {
    let el = document.getElementById("comanda-print");
    if (!el) {
      el = document.createElement("div");
      el.id = "comanda-print";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    const nomeRest = sistemaConfig.nomeRestaurante || "Restaurante";
    const SEP = '<div class="print-sep">--------------------------------</div>';
    const taxaHtml = (data.taxaEntrega ?? 0) > 0
      ? `<div class="print-item"><span>Taxa de entrega</span><span>R$ ${data.taxaEntrega!.toFixed(2).replace(".", ",")}</span></div>`
      : "";
    const pagHtml = data.formaPagamento
      ? `<div class="print-center">${data.formaPagamento}</div>`
      : "";
    const descontoHtml = (data.desconto ?? 0) > 0
      ? `<div class="print-item"><span>Desconto</span><span>- R$ ${data.desconto!.toFixed(2).replace(".", ",")}</span></div>`
      : "";
    const couvertHtml = (data.couvert ?? 0) > 0
      ? `<div class="print-item"><span>Couvert (${data.numeroPessoas ?? 0}p)</span><span>+ R$ ${data.couvert!.toFixed(2).replace(".", ",")}</span></div>`
      : "";
    const paraLevarHtml = data.paraViagem
      ? `${SEP}<div class="print-center" style="font-size:14px;font-weight:900;letter-spacing:1px">*** PARA LEVAR ***</div>${SEP}`
      : "";
    const now = new Date();
    const footerDate = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

    const isBalcaoTotem = data.origem === "balcao" || data.origem === "totem";
    const isDelivery = data.origem === "delivery";
    const cpfHtml = data.cpfNota ? `<p style="text-align:center;font-size:11px;margin-top:8px">CPF: ${data.cpfNota}</p>` : "";

    let headerHtml = "";
    if (isDelivery) {
      headerHtml = `
        <h2>${nomeRest}</h2>
        <div style="text-align:center;padding:12px 0;border:3px solid #000;margin-bottom:12px;background:#f0f0f0">
          <p style="font-size:42px;font-weight:900;line-height:1;margin:0">#${String(data.numero).padStart(3,"0")}</p>
          <p style="font-size:14px;font-weight:bold;margin-top:4px">DELIVERY</p>
          <p style="font-size:16px;font-weight:bold;margin-top:2px">${data.clienteNome || ""}</p>
        </div>
        ${data.endereco ? `<div style="font-weight:bold;font-size:12px;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:8px">${data.endereco}</div>` : ""}
        <div class="print-center" style="font-size:10px">${data.dataHora}</div>
      `;
    } else if (isBalcaoTotem) {
      headerHtml = `
        <h2>${nomeRest}</h2>
        <div style="text-align:center;padding:16px 0;border-bottom:3px solid #000;margin-bottom:12px">
          <p style="font-size:48px;font-weight:900;line-height:1;margin:0">#${String(data.numero).padStart(3,"0")}</p>
          <p style="font-size:12px;margin-top:4px">Seu número de pedido</p>
        </div>
        <div class="print-center">${data.tipo}</div>
        <div class="print-center" style="font-size:10px">${data.dataHora}</div>
      `;
    } else {
      headerHtml = `
        <h2>${nomeRest}</h2>
        <div class="print-center">${data.tipo}</div>
        <div class="print-pedido-num">#${data.numero}</div>
        <div class="print-center" style="font-size:10px">${data.dataHora}</div>
      `;
    }

    el.innerHTML = `
      ${headerHtml}
      ${paraLevarHtml}
      ${SEP}
      ${data.itens.map((it) => `<div class="print-item"><span>${it.quantidade}x ${it.nome}</span><span>R$ ${(it.preco * it.quantidade).toFixed(2).replace(".", ",")}</span></div>`).join("")}
      ${SEP}
      <div class="print-item"><span>Subtotal</span><span>R$ ${data.subtotal.toFixed(2).replace(".", ",")}</span></div>
      ${taxaHtml}${descontoHtml}${couvertHtml}
      <div class="print-total"><span>TOTAL</span><span>R$ ${data.total.toFixed(2).replace(".", ",")}</span></div>
      ${SEP}
      ${pagHtml}
      <div style="text-align:center;margin:12px 0"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RETIRADA:${data.numero}" style="width:120px;height:120px" /><p style="font-size:10px;margin-top:4px">Apresente para retirar</p></div>
      ${cpfHtml}
      <div class="print-footer">${footerDate}</div>
      <div class="print-footer">Obrigado pela preferencia!</div>
    `;
    el.style.display = "block";
    window.print();
    el.style.display = "none";
  }, [sistemaConfig.nomeRestaurante]);
  const [qrRetiradaPedidoId, setQrRetiradaPedidoId] = useState<string | null>(null);
  const qrRetiradaTimerRef = useRef<number | null>(null);

  // QR scanner dialog state
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrScanInput, setQrScanInput] = useState("");
  const qrScanInputRef = useRef<HTMLInputElement>(null);

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
            {accessMode === "gerente" ? "Gerente" : "Caixa"}
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

              {/* ── Windows-style Title Bar ── */}
               <div className="flex items-center px-4 py-2.5 shrink-0 border-b border-border bg-card">
                <p className="text-sm font-black text-foreground truncate">{sistemaConfig.nomeRestaurante || "Orderly"}</p>
                <div className="flex-1" />
                <p className="text-xs text-muted-foreground">
                  {currentOperator.nome} • {accessMode === "gerente" ? "Acesso completo" : "Operador de caixa"}
                </p>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-black tabular-nums text-foreground">{clockStr}</span>
                </div>
              </div>

              {/* ── Windows-style Toolbar ── */}
              <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 shrink-0 bg-card">
                <button
                  onClick={() => setBalcaoOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 76 }}
                >
                  <ReceiptText className="h-5 w-5" />
                  <span className="text-xs font-bold">Novo pedido</span>
                </button>
                <button
                  onClick={() => setMovModalOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 76 }}
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-xs font-bold">Sangria</span>
                </button>
                <div className="w-px h-8 mx-1 bg-border" />
                <button
                  onClick={() => setTurnoReportOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-destructive/50 bg-secondary text-destructive hover:bg-destructive/15 transition-colors"
                  style={{ minWidth: 76 }}
                >
                  <LockKeyhole className="h-5 w-5" />
                  <span className="text-xs font-bold">Fechar turno</span>
                </button>
                <button
                  onClick={() => setBuscaComandaOpen(true)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 76 }}
                >
                  <Search className="h-5 w-5" />
                  <span className="text-xs font-bold">Buscar</span>
                </button>
                <button
                  onClick={() => { setQrScanOpen(true); setQrScanInput(""); }}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 76 }}
                >
                  <QrCode className="h-5 w-5" />
                  <span className="text-xs font-bold">QR Code</span>
                </button>
                <button
                  onClick={() => logout(accessMode)}
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
                  style={{ minWidth: 76 }}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-xs font-bold">Sair</span>
                </button>
              </div>

              {/* ── Windows-style Tabs ── */}
              <div className="flex items-end px-3 pt-1 shrink-0 bg-card">
                {moduloMesas && !isFastFoodGlobal && (
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
                {sistemaConfig.deliveryAtivo !== false && (
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
                {(sistemaConfig.modulos?.totem === true || pedidosTotemAtivos.length > 0) && (
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
                  <>
                  <div className="grid gap-3 fade-in" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
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
                      const isRetirado = pb.statusBalcao === "retirado";
                      const isPreparando = pb.statusBalcao === "preparando";
                        return (
                        <div key={pb.id} className={`slide-up ${pb.statusBalcao === "cancelado" || isRetirado ? "opacity-50" : ""}`}>
                          <button
                            onClick={() => pb.statusBalcao !== "cancelado" && !isRetirado && handleSelecionarBalcao(pb.id)}
                            className={`relative flex min-h-[136px] w-full flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center mesa-card-interactive ${
                              pb.statusBalcao === "cancelado"
                                ? "border-red-500/30 bg-red-500/5 cursor-not-allowed"
                                : isRetirado
                                  ? "border-border bg-secondary/30 cursor-not-allowed"
                                  : isPronto
                                    ? "border-status-consumo/50 bg-status-consumo/8 animate-pulse"
                                    : isPreparando
                                      ? "border-amber-500/50 bg-amber-500/8"
                                      : "border-amber-500/50 bg-amber-500/8"
                            }`}
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                              pb.origem === "totem" ? "text-orange-400" : "text-muted-foreground"
                            }`}>
                              {pb.origem === "totem" ? "Totem" : "Balcão"}
                            </span>
                            <span className={`text-sm font-black truncate max-w-full px-1 ${
                              pb.statusBalcao === "cancelado" ? "line-through text-red-400" : "text-foreground"
                            }`}>
                              {pb.clienteNome || "—"}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                              pb.statusBalcao === "cancelado"
                                ? "border-red-500/25 bg-red-500/10 text-red-400"
                                : isRetirado
                                  ? "border-border bg-muted text-muted-foreground"
                                  : isPronto
                                    ? "border-status-consumo/25 bg-status-consumo/10 text-status-consumo"
                                    : isPreparando
                                      ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
                                      : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                            }`}>
                              {pb.statusBalcao === "cancelado" ? "Cancelado" : isRetirado ? "Retirado" : isPronto ? "Pronto" : isPreparando ? "Preparando" : pb.statusBalcao === "pago" ? "Pago" : "Aberto"}
                            </span>
                            {(pb as any).paraViagem === true && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400">
                                <ShoppingBag className="h-2.5 w-2.5" />
                                Para levar
                              </span>
                            )}
                            <span className={`mt-1 text-sm font-black tabular-nums ${pb.statusBalcao === "cancelado" ? "line-through text-red-400" : "text-foreground"}`}>
                              {formatPrice(pb.total)}
                            </span>
                          </button>
                          {/* Cobrar button — only when pronto */}
                          {isPronto && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSelecionarBalcao(pb.id); }}
                              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-black text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              Cobrar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </>
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
                  <div className="space-y-4 fade-in">
                    <div className="flex items-center gap-3">
                      <ScrollText className="h-5 w-5 text-primary" />
                      <h2 className="text-base font-black text-foreground flex-1">Histórico de Pedidos</h2>
                      <span className="text-xs text-muted-foreground">{allFechamentos.length} registros (últimos 30 dias)</span>
                    </div>

                    {fechamentos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fechamentos hoje</p>
                          <p className="text-2xl font-black tabular-nums text-foreground">{fechamentos.filter(f => !f.cancelado).length}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Faturado hoje</p>
                          <p className="text-2xl font-black tabular-nums text-primary">{formatPrice(fechamentos.filter(f => !f.cancelado).reduce((s, f) => s + f.total, 0))}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Estornos</p>
                          <p className="text-2xl font-black tabular-nums text-destructive">{fechamentos.filter(f => f.cancelado).length}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ticket médio</p>
                          <p className="text-2xl font-black tabular-nums text-foreground">
                            {(() => {
                              const validos = fechamentos.filter(f => !f.cancelado);
                              return validos.length > 0 ? formatPrice(validos.reduce((s, f) => s + f.total, 0) / validos.length) : "—";
                            })()}
                          </p>
                        </div>
                      </div>
                    )}

                    {allFechamentos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                        <ScrollText className="h-12 w-12 opacity-20" />
                        <p className="text-sm font-semibold">Nenhum fechamento registrado</p>
                        <p className="text-xs">Os pedidos fechados aparecerão aqui</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allFechamentos.map((f) => {
                          const origemLabel = f.origem === "delivery" ? "🛵 Delivery"
                            : f.origem === "totem" ? "🖥️ Totem"
                            : f.origem === "balcao" ? "🏪 Balcão"
                            : f.mesaNumero ? `🍽️ Mesa ${String(f.mesaNumero).padStart(2, "0")}` : "🍽️ Mesa";
                          const dataStr = f.criadoEm || new Date(f.criadoEmIso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                          return (
                            <div
                              key={f.id}
                              className={`rounded-xl border p-4 space-y-2 transition-opacity ${
                                f.cancelado ? "opacity-50 border-destructive/20 bg-destructive/5" : "border-border bg-card hover:border-primary/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {f.numeroComanda && (
                                    <span className="text-xs font-black text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                                      #{String(f.numeroComanda).padStart(4, "0")}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-muted-foreground">{origemLabel}</span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">{dataStr}</span>
                                  <span className="text-xs text-muted-foreground">por {f.caixaNome || "—"}</span>
                                </div>
                                <span className={`text-lg font-black tabular-nums ${f.cancelado ? "text-destructive line-through" : "text-foreground"}`}>
                                  {formatPrice(f.total)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {(f.pagamentos?.length ? f.pagamentos : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }])
                                  .map((p: SplitPayment, i: number) => {
                                    const style = getPaymentMethodStyle(p.formaPagamento);
                                    return (
                                      <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.borderColor} ${style.bgColor} ${style.color}`}>
                                        {getPaymentMethodLabel(p.formaPagamento)} {formatPrice(p.valor)}
                                      </span>
                                    );
                                  })
                                }
                                {f.troco != null && f.troco > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    💵 Troco {formatPrice(f.troco)}
                                  </span>
                                )}
                                {f.desconto != null && f.desconto > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                    🎁 {formatPrice(f.desconto)}
                                  </span>
                                )}
                              </div>
                              {f.itens && f.itens.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {f.itens.slice(0, 4).map((it, i) => (
                                    <span key={i} className="mr-2">{it.quantidade}× {it.nome}</span>
                                  ))}
                                  {f.itens.length > 4 && <span className="text-muted-foreground/60">+{f.itens.length - 4} mais</span>}
                                </div>
                              )}
                              {f.cancelado && f.canceladoMotivo && (
                                <p className="text-xs text-destructive">↩️ Estornado: {f.canceladoMotivo} — por {f.canceladoPor}</p>
                              )}
                            </div>
                          );
                        })}
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
                {moduloMesas && (
                  <span className="px-3 py-1.5">Consumo: {mesasConsumo}</span>
                )}
                {moduloMesas && (
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

      <CaixaTurnoReport
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
      />

      <CaixaMovimentacaoDialog
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
        isDesktop={isDesktop}
        handleRegistrarMovimentacao={handleRegistrarMovimentacao}
        movimentacoesCaixa={movimentacoesCaixa}
      />

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
                  <Input value={deliveryBusca} onChange={(e) => setDeliveryBusca(e.target.value)} placeholder="CPF ou telefone..." onKeyDown={async (e) => { if (e.key === "Enter") setDeliveryResultados(await findClienteDelivery(deliveryBusca, caixaStoreIdRef.current)); }} />
                  <Button size="sm" onClick={async () => setDeliveryResultados(await findClienteDelivery(deliveryBusca, caixaStoreIdRef.current))} className="rounded-xl font-bold gap-1.5 shrink-0"><Search className="h-4 w-4" />Buscar</Button>
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

            {/* Tempo estimado */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <label className="text-xs font-black text-foreground uppercase tracking-widest">🕐 Tempo estimado (minutos)</label>
              <Input
                value={deliveryTempoEstimado}
                onChange={(e) => setDeliveryTempoEstimado(e.target.value.replace(/\D/g, ""))}
                placeholder={sistemaConfig.tempoEntrega || "40"}
                inputMode="numeric"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" onClick={() => { setDeliveryConfirmOpen(false); setBalcaoFlowAtivo(true); }} className="rounded-xl font-bold w-full">← Voltar ao cardápio</Button>
            <Button onClick={() => handleDeliveryConfirm(false)} className="rounded-xl font-black gap-1.5 w-full">
              <Check className="h-4 w-4" />
              Confirmar e enviar para cozinha
            </Button>
            {balcaoTelefone.trim() && (
              <Button onClick={() => handleDeliveryConfirm(true)} variant="outline" className="rounded-xl font-black gap-1.5 w-full border-green-500/30 text-green-600 hover:bg-green-500/10">
                <Smartphone className="h-4 w-4" />
                Confirmar e avisar cliente
              </Button>
            )}
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

      <CaixaMotoboyConferencia
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
      />

      {descontoModalOpen && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-base font-black">🎁 Aplicar desconto</p>
              <p className="text-xs text-muted-foreground mt-0.5">Requer autorização do gerente</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["percentual", "valor"] as const).map(t => (
                  <button key={t} onClick={() => setDescontoTipo(t)}
                    className={`rounded-xl border py-2.5 text-sm font-black transition-colors ${descontoTipo === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    {t === "percentual" ? "% Percentual" : "R$ Valor fixo"}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">
                  {descontoTipo === "percentual" ? "Percentual (%)" : "Valor (R$)"}
                </label>
                <Input value={descontoInput} onChange={e => setDescontoInput(e.target.value)}
                  placeholder={descontoTipo === "percentual" ? "Ex.: 10" : "Ex.: 15,00"}
                  inputMode="decimal" className="h-11 rounded-xl font-bold text-lg" />
                {descontoTipo === "percentual" && (() => {
                  const pct = parseCurrencyInput(descontoInput);
                  if (!Number.isFinite(pct) || pct <= 0) return null;
                  return <p className="text-xs text-primary font-bold">= {formatPrice((mesa?.total ?? 0) * (pct / 100))} de desconto</p>;
                })()}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Motivo (obrigatório)</label>
                <Input value={descontoMotivo} onChange={e => setDescontoMotivo(e.target.value)}
                  placeholder="Ex.: cliente VIP, cortesia, erro no pedido" className="h-11 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Nome do gerente</label>
                  <Input value={descontoManagerName} onChange={e => setDescontoManagerName(e.target.value)}
                    placeholder="Nome" className="h-10 rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">PIN</label>
                  <Input value={descontoManagerPin} onChange={e => setDescontoManagerPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    type="password" inputMode="numeric" placeholder="••••"
                    className="h-10 rounded-xl text-sm text-center tracking-widest font-black" />
                </div>
              </div>
              {descontoError && <p className="text-xs text-destructive font-bold">{descontoError}</p>}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl font-bold"
                onClick={() => { setDescontoModalOpen(false); setDescontoError(null); }}>Cancelar</Button>
              <Button className="flex-1 rounded-xl font-black" onClick={handleAplicarDesconto}>Aplicar desconto</Button>
            </div>
          </div>
        </div>
      )}

      {estornoModalOpen && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-destructive/5">
              <p className="text-base font-black text-destructive">↩️ Estornar fechamento</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O fechamento é marcado como cancelado e registrado no log. Não remove o valor do caixa.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Motivo do estorno (obrigatório)</label>
                <Input
                  value={estornoMotivo}
                  onChange={e => setEstornoMotivo(e.target.value)}
                  placeholder="Ex.: pagamento incorreto, cliente reclamou..."
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Nome do gerente</label>
                  <Input
                    value={estornoNome}
                    onChange={e => setEstornoNome(e.target.value)}
                    placeholder="Nome"
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">PIN</label>
                  <Input
                    value={estornoPin}
                    onChange={e => setEstornoPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    type="password"
                    inputMode="numeric"
                    placeholder="••••"
                    className="h-10 rounded-xl text-sm text-center tracking-widest font-black"
                  />
                </div>
              </div>
              {estornoError && (
                <p className="text-xs text-destructive font-bold">{estornoError}</p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl font-bold"
                onClick={() => { setEstornoModalOpen(false); setEstornoError(null); }}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 rounded-xl font-black"
                onClick={handleEstornar}>
                Confirmar estorno
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUSCA COMANDA MODAL ── */}
      {buscaComandaOpen && (
        <div className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={buscaComanda}
              onChange={e => setBuscaComanda(e.target.value)}
              placeholder="Buscar por #0001, mesa 02, nome do operador..."
              className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => { setBuscaComandaOpen(false); setBuscaComanda(""); }}
              className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border"
            >
              Fechar
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {buscaComanda.trim() === "" ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                <Search className="h-10 w-10 opacity-20" />
                <p className="text-sm font-bold">Digite o número da comanda</p>
                <p className="text-xs">Ex: #0001, mesa 02, nome do operador</p>
              </div>
            ) : resultadosBusca.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                <p className="text-sm font-bold">Nenhum resultado para &quot;{buscaComanda}&quot;</p>
              </div>
            ) : (
              resultadosBusca.map(f => (
                <div key={f.id} className={`rounded-xl border bg-card p-4 space-y-2 ${
                  f.cancelado ? "opacity-50 border-destructive/20" : "border-border"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {f.numeroComanda && (
                        <span className="text-sm font-black text-primary bg-primary/10 border border-primary/20 rounded-lg px-2 py-0.5">
                          #{String(f.numeroComanda).padStart(4, "0")}
                        </span>
                      )}
                      <span className="text-sm font-bold text-foreground">
                        {f.mesaNumero === 0 ? "Balcão" : `Mesa ${String(f.mesaNumero).padStart(2, "0")}`}
                      </span>
                      <span className="text-xs text-muted-foreground">{f.criadoEm}</span>
                      <span className="text-xs text-muted-foreground">· {f.caixaNome}</span>
                      {f.cancelado && (
                        <span className="text-xs font-black text-destructive">↩️ Estornado</span>
                      )}
                    </div>
                    <span className="text-lg font-black tabular-nums text-primary">
                      {formatPrice(f.total)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(f.pagamentos?.length
                      ? f.pagamentos
                      : [{ id: f.id, formaPagamento: f.formaPagamento, valor: f.total }]
                    ).map((p: SplitPayment, i: number) => {
                      const style = getPaymentMethodStyle(p.formaPagamento);
                      const Icon = style.icon;
                      return (
                        <div key={i} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${style.bgColor} ${style.borderColor}`}>
                          <Icon className={`h-3 w-3 ${style.color}`} />
                          <span className={`text-xs font-bold tabular-nums ${style.color}`}>{formatPrice(p.valor)}</span>
                        </div>
                      );
                    })}
                    {f.troco != null && f.troco > 0 && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                        <span className="text-xs font-bold text-emerald-400">💵 Troco: {formatPrice(f.troco)}</span>
                      </div>
                    )}
                    {f.desconto != null && f.desconto > 0 && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
                        <span className="text-xs font-bold text-primary">🎁 Desconto: -{formatPrice(f.desconto)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {f.itens && f.itens.length > 0 && (
                        <span>
                          {f.itens.slice(0, 2).map((it, i) => (
                            <span key={i}>{it.quantidade}× {it.nome}{i < Math.min(f.itens!.length, 2) - 1 ? ", " : ""}</span>
                          ))}
                          {f.itens.length > 2 && <span> +{f.itens.length - 2} itens</span>}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const trocoStr = f.troco && f.troco > 0
                            ? `<div class="print-item"><span>💵 Troco devolvido</span><span>R$ ${f.troco.toFixed(2).replace(".", ",")}</span></div>`
                            : "";
                          const descontoStr = f.desconto && f.desconto > 0
                            ? `<div class="print-item" style="color:#c85b0a"><span>🎁 Desconto aplicado</span><span>- R$ ${f.desconto.toFixed(2).replace(".", ",")}</span></div>`
                            : "";
                          const couvertStr = f.couvert && f.couvert > 0
                            ? `<div class="print-item" style="color:#059669"><span>🍽️ Couvert (${f.numeroPessoas ?? 0} pessoa${(f.numeroPessoas ?? 0) !== 1 ? "s" : ""})</span><span>+ R$ ${f.couvert.toFixed(2).replace(".", ",")}</span></div>`
                            : "";
                          const pagStr = (f.pagamentos?.length
                            ? f.pagamentos
                            : [{ formaPagamento: f.formaPagamento, valor: f.total }]
                          ).map((p: any) => `<div class="print-item"><span>${getPaymentMethodLabel(p.formaPagamento as PaymentMethod)}</span><span>R$ ${p.valor.toFixed(2).replace(".", ",")}</span></div>`).join("");
                          const itensStr = (f.itens || []).map((it: any) =>
                            `<div class="print-item"><span>${it.quantidade}x ${it.nome}</span><span>R$ ${(it.precoUnitario * it.quantidade).toFixed(2).replace(".", ",")}</span></div>`
                          ).join("");
                          const w = window.open("", "_blank", "width=400,height=600");
                          if (!w) return;
                          w.document.write(`<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:13px;padding:16px;max-width:300px;margin:0 auto}h2{text-align:center;font-size:15px;margin-bottom:4px}.sub{text-align:center;color:#666;font-size:11px;margin-bottom:12px}hr{border:none;border-top:1px dashed #999;margin:8px 0}.print-item{display:flex;justify-content:space-between;margin:3px 0}.total{font-weight:bold;font-size:15px;display:flex;justify-content:space-between;margin-top:8px}.center{text-align:center;margin-top:12px;font-size:11px;color:#666}</style></head><body><h2>${f.mesaNumero === 0 ? "Balcão" : `Mesa ${String(f.mesaNumero).padStart(2,"0")}`}${f.numeroComanda ? ` — Comanda #${String(f.numeroComanda).padStart(4,"0")}` : ""}</h2><div class="sub">${f.criadoEm} • ${f.caixaNome}</div><hr/>${itensStr}<hr/>${descontoStr}${couvertStr}${pagStr}${trocoStr}<hr/><div class="total"><span>TOTAL</span><span>R$ ${f.total.toFixed(2).replace(".",",")}</span></div><div class="center">Obrigado pela visita!</div></body></html>`);
                          w.document.close();
                          w.focus();
                          setTimeout(() => { w.print(); w.close(); }, 400);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Printer className="h-3 w-3" /> Reimprimir
                      </button>
                      {!f.cancelado && (
                        <button
                          type="button"
                          onClick={() => {
                            setEstornoFechamentoId(f.id);
                            setEstornoModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive/70 hover:text-destructive hover:border-destructive transition-colors"
                        >
                          ↩️ Estornar
                        </button>
                      )}
                      {f.cancelado && (
                        <span className="text-xs font-bold text-destructive/50 px-2">↩️ Estornado</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── QR SCANNER DIALOG ── */}
      <Dialog open={qrScanOpen} onOpenChange={(o) => { setQrScanOpen(o); if (!o) setQrScanInput(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leitura de QR Code</DialogTitle>
            <DialogDescription>
              Escaneie o cupom do cliente ou digite o código
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              ref={qrScanInputRef}
              autoFocus
              value={qrScanInput}
              onChange={(e) => setQrScanInput(e.target.value)}
              placeholder="Aguardando leitura..."
              className="text-lg font-mono h-12"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleQrScan(qrScanInput);
                  setQrScanInput("");
                  setTimeout(() => qrScanInputRef.current?.focus(), 50);
                }
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              O leitor USB envia os dados como digitação. Pressione Enter ou escaneie.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQrScanOpen(false); setQrScanInput(""); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LicenseBanner context="operational" />
    </>
  );
};

export default CaixaPage;
