import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LogOut, Bell, Search, CreditCard, Smartphone, Wallet, ShoppingBag, Trash2, Plus, Check, Printer, BellRing, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useSearchParams, useNavigate } from "react-router-dom";
import PedidoFlow from "@/components/PedidoFlow";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";
import ModuleGate from "@/components/ModuleGate";
import LicenseBanner from "@/components/LicenseBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { useRouteLock } from "@/hooks/use-route-lock";
import type { PaymentMethod, SplitPayment, FiltroMesa } from "@/types/operations";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import { formatPrice, printComanda } from "@/components/caixa/caixaHelpers";
import { getSistemaConfig } from "@/lib/adminStorage";
import { playSuccessSound, playAlertSound, vibrateSuccess, vibrateAlert } from "@/lib/sounds";
import OfflineIndicator from "@/components/OfflineIndicator";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "debito", label: "Débito", icon: Wallet },
];

const GarcomPdvPage = () => {
  const { mesas, dismissChamarGarcom, fecharConta, caixaAberto, criarPedidoBalcao } = useRestaurant();
  const { currentGarcom, logout, authLevel } = useAuth();
  const isAdminAccess = authLevel === "admin" || authLevel === "master";
  const [searchParams, setSearchParams] = useSearchParams();
  const mesaIdSelecionada = searchParams.get("mesa")?.trim() ?? "";
  const [filtro, setFiltro] = useState<FiltroMesa>("todas");

  // Detect fast food mode
  const config = getSistemaConfig();
  const isFastFood = config.modulos?.mesas === false;
  const [mesaBusca, setMesaBusca] = useState("");
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );

  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [pagamentoMesaId, setPagamentoMesaId] = useState<string | null>(null);
  const [pagamentos, setPagamentos] = useState<SplitPayment[]>([]);
  const [pagamentoMethod, setPagamentoMethod] = useState<PaymentMethod>("pix");
  const [pagamentoValue, setPagamentoValue] = useState("");
  const [processando, setProcessando] = useState(false);
  const [actionMesaId, setActionMesaId] = useState<string | null>(null);

  // Alerta sonoro/tátil quando mesa chama garçom
  const chamadoCount = mesas.filter((m) => m.chamarGarcom).length;
  const prevChamadoRef = useRef(chamadoCount);
  useEffect(() => {
    if (chamadoCount > prevChamadoRef.current) {
      playAlertSound();
      vibrateAlert();
    }
    prevChamadoRef.current = chamadoCount;
  }, [chamadoCount]);

  const goToChamados = useCallback(() => {
    setSearchParams({});
    setPagamentoOpen(false);
    setPagamentoMesaId(null);
    setReceiptData(null as any);
    setFiltro("chamado");
  }, [setSearchParams]);

  const floatingChamadoBadge = chamadoCount > 0 ? (
    <button
      onClick={goToChamados}
      className="fixed top-4 right-4 z-50 flex items-center gap-1.5 bg-destructive text-destructive-foreground px-3 py-2 rounded-full shadow-lg animate-bounce"
    >
      <BellRing className="h-4 w-4" />
      <span className="text-sm font-black">{chamadoCount}</span>
    </button>
  ) : null;
  const [receiptData, setReceiptData] = useState<{
    mesaNumero: number;
    total: number;
    formasLabel: string;
    pagamentos: SplitPayment[];
    itens: Array<{ quantidade: number; nome: string; preco: number }>;
    numeroPedido: number;
  } | null>(null);
  // Fast food flow states
  const [ffStep, setFfStep] = useState<"menu" | "payment" | "processing" | "done">("menu");
  const [ffPendingItens, setFfPendingItens] = useState<ItemCarrinho[]>([]);
  const [ffPendingTotal, setFfPendingTotal] = useState(0);
  const [ffPaymentMethod, setFfPaymentMethod] = useState<PaymentMethod | null>(null);
  const [ffNumeroPedido, setFfNumeroPedido] = useState<number | null>(null);
  const [ffSubmitting, setFfSubmitting] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateExit = useNavigate();

  const handleLongPressStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      setExitDialogOpen(true);
    }, 5000);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleExitSession = useCallback(async () => {
    setExitDialogOpen(false);
    sessionStorage.removeItem("obsidian-op-session-v2");
    localStorage.removeItem("obsidian-op-session-v2-persisted");
    await logout();
    navigateExit("/", { replace: true });
    window.location.reload();
  }, [logout, navigateExit]);

  useRouteLock("/garcom-pdv");

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const pagamentoMesa = useMemo(() =>
    pagamentoMesaId ? mesas.find(m => m.id === pagamentoMesaId) : null,
  [pagamentoMesaId, mesas]);

  const totalConta = pagamentoMesa?.total ?? 0;
  const totalPago = useMemo(() => pagamentos.reduce((s, p) => s + p.valor, 0), [pagamentos]);
  const valorRestante = Math.max(0, Math.round((totalConta - totalPago) * 100) / 100);
  const fechamentoPronto = totalConta > 0 && Math.abs(totalPago - totalConta) < 0.01;
  const paymentProgress = totalConta > 0 ? Math.min(100, (totalPago / totalConta) * 100) : 0;

  const allItens = useMemo(() => {
    if (!pagamentoMesa) return [];
    const items: { nome: string; qtd: number; precoUnit: number }[] = [];
    for (const pedido of pagamentoMesa.pedidos) {
      for (const item of pedido.itens) {
        const existing = items.find(i => i.nome === item.nome && i.precoUnit === item.precoUnitario);
        if (existing) {
          existing.qtd += item.quantidade;
        } else {
          items.push({ nome: item.nome, qtd: item.quantidade, precoUnit: item.precoUnitario });
        }
      }
    }
    return items;
  }, [pagamentoMesa]);

  const handleCobrar = useCallback((mesaId: string) => {
    if (!caixaAberto) {
      toast.error("O caixa precisa estar aberto para realizar cobranças.");
      return;
    }
    const mesa = mesas.find(m => m.id === mesaId);
    setPagamentoMesaId(mesaId);
    setPagamentoOpen(true);
    setPagamentos([]);
    setPagamentoMethod("pix");
    setPagamentoValue(formatPrice(mesa?.total ?? 0).replace("R$\u00a0", "").replace(".", "").replace(",", "."));
  }, [caixaAberto, mesas]);

  const handleAddPagamento = useCallback(() => {
    const val = parseFloat(pagamentoValue.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (Math.round((totalPago + val) * 100) > Math.round(totalConta * 100)) {
      toast.error("Valor excede o total da conta.");
      return;
    }
    const novo: SplitPayment = {
      id: `pag-pdv-${Date.now()}-${pagamentos.length}`,
      formaPagamento: pagamentoMethod,
      valor: Math.round(val * 100) / 100,
    };
    const updated = [...pagamentos, novo];
    setPagamentos(updated);
    const novoRestante = Math.max(0, Math.round((totalConta - updated.reduce((s, p) => s + p.valor, 0)) * 100) / 100);
    setPagamentoValue(novoRestante > 0 ? novoRestante.toFixed(2) : "");
  }, [pagamentoValue, pagamentoMethod, pagamentos, totalPago, totalConta]);

  const handleRemovePagamento = useCallback((id: string) => {
    const updated = pagamentos.filter(p => p.id !== id);
    setPagamentos(updated);
    const novoRestante = Math.max(0, Math.round((totalConta - updated.reduce((s, p) => s + p.valor, 0)) * 100) / 100);
    setPagamentoValue(novoRestante > 0 ? novoRestante.toFixed(2) : "");
  }, [pagamentos, totalConta]);

  const handleConfirmarPagamento = useCallback(async () => {
    if (processando) return;
    if (!pagamentoMesaId || !currentGarcom) return;
    if (!fechamentoPronto) {
      toast.error("O valor pago não cobre o total da conta.");
      return;
    }
    setProcessando(true);

    const mesa = mesas.find(m => m.id === pagamentoMesaId);
    if (!mesa || mesa.total === 0) {
      toast.error("Mesa sem consumo para fechar");
      setProcessando(false);
      return;
    }

    const result = await fecharConta(pagamentoMesaId, {
      usuario: {
        id: currentGarcom.id,
        nome: currentGarcom.nome,
        role: "garcom" as const,
        criadoEm: currentGarcom.criadoEm || new Date().toISOString(),
      },
      pagamentos,
      troco: 0,
      desconto: 0,
      origemOverride: "garcom_pdv",
    });

    if (!result.ok) {
      toast.error("Erro ao fechar conta. Tente novamente.");
      setProcessando(false);
      return;
    }

    const formas = [...new Set(pagamentos.map(p =>
      p.formaPagamento === "pix" ? "PIX" : p.formaPagamento === "credito" ? "Crédito" : "Débito"
    ))].join(" + ");

    const lastPedido = mesa.pedidos[mesa.pedidos.length - 1];
    const allItensSnapshot = mesa.pedidos.flatMap(p => p.itens);

    setReceiptData({
      mesaNumero: mesa.numero,
      total: mesa.total,
      formasLabel: formas,
      pagamentos: [...pagamentos],
      itens: allItensSnapshot.map(i => ({ quantidade: i.quantidade, nome: i.nome, preco: i.precoUnitario })),
      numeroPedido: lastPedido?.numeroPedido ?? 0,
    });

    playSuccessSound();
    vibrateSuccess();

    setPagamentoOpen(false);
    setPagamentoMesaId(null);
    setPagamentos([]);
    setProcessando(false);
  }, [pagamentoMesaId, pagamentos, mesas, fecharConta, currentGarcom, fechamentoPronto, processando]);

  const handlePrintReceipt = useCallback(() => {
    if (!receiptData) return;
    const nomeRest = getSistemaConfig().nomeRestaurante || "Restaurante";
    const now = new Date();
    const dataHora = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    printComanda({
      tipo: `Mesa ${String(receiptData.mesaNumero).padStart(2, "0")}`,
      numero: receiptData.numeroPedido,
      dataHora,
      itens: receiptData.itens,
      subtotal: receiptData.total,
      total: receiptData.total,
      formaPagamento: receiptData.formasLabel,
      origem: "mesa",
    }, nomeRest);
  }, [receiptData]);

  const handleCloseReceipt = useCallback(() => {
    setReceiptData(null);
    setSearchParams({});
  }, [setSearchParams]);

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

  const exitDialog = (
    <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar sessão?</AlertDialogTitle>
          <AlertDialogDescription>
            Você será desconectado e poderá trocar de garçom neste equipamento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={handleExitSession} variant="destructive">Sim, sair</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const longPressAvatar = (
    <div
      className="w-10 h-10 rounded-full bg-card/80 flex items-center justify-center cursor-pointer select-none border border-border"
      onPointerDown={handleLongPressStart}
      onPointerUp={handleLongPressEnd}
      onPointerLeave={handleLongPressEnd}
      onContextMenu={(e) => e.preventDefault()}
      title="Segure 5s para sair"
    >
      <span className="text-xs font-bold text-muted-foreground">{garcomNome.charAt(0).toUpperCase()}</span>
    </div>
  );

  // ===================== FAST FOOD MODE =====================
  if (isFastFood) {
    // Payment selection
    if (ffStep === "payment" && ffPendingItens.length > 0) {
      return (
        <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
          <div className="min-h-svh bg-background flex flex-col items-center justify-center gap-6 p-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black text-foreground">Como o cliente vai pagar?</h1>
              <p className="text-lg font-bold text-primary">Total: {formatPrice(ffPendingTotal)}</p>
              <p className="text-xs text-muted-foreground">Garçom: {garcomNome}</p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-sm">
              {([
                { value: "pix" as PaymentMethod, label: "PIX", icon: QrCode, desc: "QR Code no caixa" },
                { value: "credito" as PaymentMethod, label: "Crédito", icon: CreditCard, desc: "Maquininha" },
                { value: "debito" as PaymentMethod, label: "Débito", icon: Wallet, desc: "Maquininha" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={async () => {
                    if (ffSubmitting) return;
                    setFfSubmitting(true);
                    setFfPaymentMethod(opt.value);
                    setFfStep("processing");

                    try {
                      const operador = currentGarcom
                        ? { id: currentGarcom.id, nome: currentGarcom.nome, role: "garcom" as const, criadoEm: currentGarcom.criadoEm || new Date().toISOString() }
                        : { id: "admin", nome: "Administrador", role: "garcom" as const, criadoEm: new Date().toISOString() };

                      const numeroPedido = await criarPedidoBalcao({
                        itens: ffPendingItens,
                        origem: "balcao",
                        operador,
                        clienteNome: garcomNome,
                        formaPagamentoTotem: opt.value,
                      });
                      setFfNumeroPedido(numeroPedido);
                      setFfStep("done");
                      playSuccessSound();
                      vibrateSuccess();
                    } catch (err) {
                      console.error("Garçom PDV FF: erro ao criar pedido", err);
                      toast.error("Erro ao enviar pedido. Tente novamente.");
                      setFfStep("payment");
                    } finally {
                      setFfSubmitting(false);
                    }
                  }}
                  disabled={ffSubmitting}
                  className="flex items-center gap-4 h-16 rounded-2xl border-2 border-border bg-card px-5 transition-all active:scale-[0.98] hover:border-primary/50"
                >
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-primary text-primary-foreground">
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setFfStep("menu"); setFfPendingItens([]); }}
              className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar ao cardápio
            </button>
          </div>
        </ModuleGate>
      );
    }

    // Processing
    if (ffStep === "processing") {
      return (
        <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
          <div className="min-h-svh bg-background flex flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm font-bold text-muted-foreground">Enviando pedido...</p>
          </div>
        </ModuleGate>
      );
    }

    // Done
    if (ffStep === "done" && ffNumeroPedido !== null) {
      return (
        <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
          <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6 gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Pedido enviado!</h2>
            <p className="text-5xl font-black text-primary tabular-nums">#{String(ffNumeroPedido).padStart(3, "0")}</p>
            <p className="text-sm text-muted-foreground">
              Pagamento: {ffPaymentMethod === "pix" ? "PIX" : ffPaymentMethod === "credito" ? "Crédito" : "Débito"}
            </p>
            <Button
              className="h-12 w-full max-w-xs rounded-xl font-black"
              onClick={() => {
                setFfStep("menu");
                setFfPendingItens([]);
                setFfNumeroPedido(null);
                setFfPaymentMethod(null);
              }}
            >
              Novo pedido
            </Button>
          </div>
        </ModuleGate>
      );
    }

    // Menu (PedidoFlow in balcao mode)
    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        <OfflineIndicator />
        {exitDialog}
        <PedidoFlow
          modo="balcao"
          clienteNome={garcomNome}
          onPedidoConfirmado={(itens) => {
            setFfPendingItens(itens);
            setFfPendingTotal(itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0));
            setFfStep("payment");
          }}
          onBack={() => {
            if (!isAdminAccess) {
              logout("garcom");
            }
          }}
          onExitSession={() => setExitDialogOpen(true)}
        />
        <LicenseBanner context="operational" />
      </ModuleGate>
    );
  }

  // ===================== RESTAURANT MODE (with mesas) =====================

  // Tela de pagamento digital
  if (pagamentoOpen && pagamentoMesaId) {
    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        {floatingChamadoBadge}
        <div className="min-h-svh bg-background flex flex-col">
          {/* Header */}
          <div className="shrink-0 border-b border-border bg-card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Mesa {pagamentoMesa?.numero}</p>
              <p className="text-xs text-muted-foreground">{garcomNome} • Garçom PDV</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold"
              onClick={() => {
                setPagamentoOpen(false);
                setPagamentoMesaId(null);
                setPagamentos([]);
              }}
            >
              Voltar
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* RESUMO DA CONTA */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resumo da conta</p>
              </div>
              <div className="divide-y divide-border/50">
                {allItens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-6 text-right shrink-0">{item.qtd}×</span>
                      <span className="text-sm text-foreground truncate">{item.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground tabular-nums shrink-0 ml-2">
                      {formatPrice(item.precoUnit * item.qtd)}
                    </span>
                  </div>
                ))}
                {allItens.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum item</p>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
                <span className="text-sm font-black text-foreground">TOTAL</span>
                <span className="text-lg font-black text-primary tabular-nums">{formatPrice(totalConta)}</span>
              </div>
            </div>

            {/* PAGAMENTOS ADICIONADOS */}
            {pagamentos.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/30">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pagamentos</p>
                </div>
                <div className="divide-y divide-border/50">
                  {pagamentos.map((p) => {
                    const label = p.formaPagamento === "pix" ? "PIX" : p.formaPagamento === "credito" ? "Crédito" : "Débito";
                    return (
                      <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{label}</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{formatPrice(p.valor)}</span>
                        </div>
                        <button
                          onClick={() => handleRemovePagamento(p.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-bold">Pago</span>
                    <span className={`font-black tabular-nums ${fechamentoPronto ? "text-emerald-400" : "text-foreground"}`}>
                      {formatPrice(totalPago)} / {formatPrice(totalConta)}
                    </span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                  {valorRestante > 0 && (
                    <p className="text-xs text-amber-400 font-bold text-center">
                      Falta {formatPrice(valorRestante)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ADICIONAR PAGAMENTO */}
            {!fechamentoPronto && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                  Adicionar pagamento
                </p>
                <div className="flex gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPagamentoMethod(opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                        pagamentoMethod === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-primary/40"
                      }`}
                    >
                      <opt.icon className={`h-5 w-5 ${
                        pagamentoMethod === opt.value ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <span className={`text-xs font-bold ${
                        pagamentoMethod === opt.value ? "text-foreground" : "text-muted-foreground"
                      }`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">R$</span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={pagamentoValue}
                      onChange={(e) => setPagamentoValue(e.target.value)}
                      className="h-12 rounded-xl pl-10 text-lg font-bold tabular-nums"
                    />
                  </div>
                  <Button
                    onClick={handleAddPagamento}
                    className="h-12 rounded-xl font-bold gap-1.5 px-5"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            {/* CONFIRMAR */}
            {fechamentoPronto && (
              <Button
                className="w-full h-14 rounded-2xl font-black text-base gap-2"
                disabled={processando}
                onClick={handleConfirmarPagamento}
              >
                <Check className="h-5 w-5" />
                {processando ? "Processando..." : "Confirmar pagamento"}
              </Button>
            )}

            <p className="text-[10px] text-center text-muted-foreground pb-2">
              Garçom PDV — apenas pagamentos digitais
            </p>
          </div>
        </div>
      </ModuleGate>
    );
  }

  // Receipt dialog
  if (receiptData) {
    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        {floatingChamadoBadge}
        <div className="min-h-svh bg-background flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-5">
            {/* Success header */}
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-foreground">Pagamento realizado</h2>
              <p className="text-sm text-muted-foreground">
                Mesa {String(receiptData.mesaNumero).padStart(2, "0")}
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border/50">
                {receiptData.itens.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs text-muted-foreground">{item.quantidade}× {item.nome}</span>
                    <span className="text-xs font-bold text-foreground tabular-nums">{formatPrice(item.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
                <span className="text-sm font-black text-foreground">TOTAL</span>
                <span className="text-lg font-black text-primary tabular-nums">{formatPrice(receiptData.total)}</span>
              </div>
              <div className="flex items-center justify-center px-4 py-2 border-t border-border">
                <span className="text-xs font-bold text-muted-foreground">
                  Pago com: <span className="text-foreground">{receiptData.formasLabel}</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12 rounded-xl font-bold gap-2"
                variant="outline"
                onClick={handlePrintReceipt}
              >
                <Printer className="h-4 w-4" />
                Imprimir comanda
              </Button>
              <Button
                className="w-full h-12 rounded-xl font-black"
                onClick={handleCloseReceipt}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </ModuleGate>
    );
  }

  // Tela de pedido (PedidoFlow)
  if (mesaIdSelecionada) {
    return (
      <ModuleGate moduleKey="garcomPdv" moduleName="Garçom PDV">
        {floatingChamadoBadge}
        <PedidoFlow
          modo="garcom"
          mesaId={mesaIdSelecionada}
          garcomNome={garcomNome}
          onBack={() => setSearchParams({})}
        />
      </ModuleGate>
    );
  }


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
      <OfflineIndicator />
      <AppLayout
        title="Garçom PDV"
        headerRight={
          <div className="flex items-center gap-2">
            {longPressAvatar}
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
        {exitDialog}
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
                    setActionMesaId(mesa.id);
                  } else {
                    setSearchParams({ mesa: mesa.id });
                  }
                }}
              />
              {mesa.status === "consumo" && mesa.total > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMesaId(mesa.id);
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

        {(() => {
          const actionMesa = actionMesaId ? mesas.find(m => m.id === actionMesaId) : null;
          return (
            <AlertDialog open={!!actionMesaId} onOpenChange={(open) => { if (!open) setActionMesaId(null); }}>
              <AlertDialogContent className="max-w-xs rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center">
                    Mesa {actionMesa?.numero}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center">
                    Total atual: <span className="font-bold text-foreground">{formatPrice(actionMesa?.total ?? 0)}</span>
                    <br />
                    {actionMesa?.pedidos.length ?? 0} pedido(s)
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-2">
                  <Button
                    className="h-12 rounded-xl font-bold gap-2"
                    variant="outline"
                    onClick={() => {
                      const id = actionMesaId!;
                      setActionMesaId(null);
                      setSearchParams({ mesa: id });
                    }}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Adicionar itens
                  </Button>
                  <Button
                    className="h-12 rounded-xl font-black gap-2"
                    onClick={() => {
                      const id = actionMesaId!;
                      setActionMesaId(null);
                      handleCobrar(id);
                    }}
                  >
                    <CreditCard className="h-5 w-5" />
                    Cobrar {formatPrice(actionMesa?.total ?? 0)}
                  </Button>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="w-full rounded-xl">Cancelar</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        })()}

        <LicenseBanner context="operational" />
      </AppLayout>
    </ModuleGate>
  );
};

export default GarcomPdvPage;
