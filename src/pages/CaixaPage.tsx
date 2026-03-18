import { useCallback, useMemo, useState } from "react";
import {
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
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import PedidoFlow from "@/components/PedidoFlow";
import MesaCard from "@/components/MesaCard";
import OperationalAccessCard from "@/components/OperationalAccessCard";
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
import {
  clearBoundTabletMesaId,
  clearTabletLoginUser,
  getBoundTabletMesaId,
  setBoundTabletMesaId,
} from "@/lib/tabletBinding";
import type { PaymentMethod, SplitPayment, UserRole } from "@/types/operations";

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
}> = [
  { value: "dinheiro", label: "Dinheiro", icon: Landmark },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Smartphone },
];

const getPaymentMethodLabel = (method: PaymentMethod) =>
  paymentMethodOptions.find((option) => option.value === method)?.label ?? method;

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
  desvincular_tablet: "Desvínculo do tablet",
  vincular_tablet: "Vínculo do tablet",
};

type CriticalAction =
  | {
      type: "zerar_mesa";
      mesaId: string;
      mesaNumero: number;
    }
  | {
      type: "remover_item_carrinho";
      mesaId: string;
      mesaNumero: number;
      itemUid: string;
      itemNome: string;
    }
  | {
      type: "remover_item_pedido";
      mesaId: string;
      mesaNumero: number;
      pedidoId: string;
      pedidoNumero: number;
      itemUid: string;
      itemNome: string;
      quantidade: number;
    }
  | {
      type: "cancelar_pedido";
      mesaId: string;
      mesaNumero: number;
      pedidoId: string;
      pedidoNumero: number;
    }
  | {
      type: "desvincular_tablet";
      mesaId: string;
      mesaNumero: number;
    }
  | {
      type: "vincular_tablet";
      mesaId: string | null;
      mesaNumero: number | null;
      proximaMesaId: string;
      proximaMesaNumero: number;
    };

interface CaixaPageProps {
  accessMode?: Extract<UserRole, "caixa" | "gerente">;
}

const CaixaPage = ({ accessMode = "caixa" }: CaixaPageProps) => {
  const {
    mesas,
    eventos,
    fechamentos,
    movimentacoesCaixa,
    fecharConta,
    zerarMesa,
    dismissChamarGarcom,
    updateCartItemQty,
    removeFromCart,
    ajustarItemPedido,
    cancelarPedido,
  } = useRestaurant();
  const { currentCaixa, currentGerente, logout, verifyManagerAccess } = useAuth();
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [comandaOpen, setComandaOpen] = useState(false);
  const [confirmFechar, setConfirmFechar] = useState(false);
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
  const [tabletMesaId, setTabletMesaId] = useState<string | null>(() => getBoundTabletMesaId());
  const [tabletTargetMesaNumber, setTabletTargetMesaNumber] = useState("");

  const mesa = mesaSelecionada ? mesas.find((item) => item.id === mesaSelecionada) ?? null : null;
  const tabletMesa = useMemo(() => (tabletMesaId ? mesas.find((item) => item.id === tabletMesaId) ?? null : null), [mesas, tabletMesaId]);
  const currentOperator = accessMode === "gerente" ? currentGerente : currentCaixa;
  const screenTitle = mesa
    ? `Mesa ${String(mesa.numero).padStart(2, "0")}`
    : accessMode === "gerente"
      ? "Gerente"
      : "Caixa";

  useRouteLock(accessMode === "gerente" ? "/gerente" : "/caixa");

  const resumoFinanceiro = useMemo(() => {
    const totalDia = fechamentos.reduce((acc, fechamento) => acc + fechamento.total, 0);
    const entradasExtras = movimentacoesCaixa
      .filter((movimentacao) => movimentacao.tipo === "entrada")
      .reduce((acc, movimentacao) => acc + movimentacao.valor, 0);
    const saidas = movimentacoesCaixa
      .filter((movimentacao) => movimentacao.tipo === "saida")
      .reduce((acc, movimentacao) => acc + movimentacao.valor, 0);
    const sumByMethod = (method: PaymentMethod) =>
      fechamentos.reduce((acc, fechamento) => {
        const pagamentos = fechamento.pagamentos?.length
          ? fechamento.pagamentos
          : [{ id: fechamento.id, formaPagamento: fechamento.formaPagamento, valor: fechamento.total }];
        return acc + pagamentos.filter((pagamento) => pagamento.formaPagamento === method).reduce((subtotal, pagamento) => subtotal + pagamento.valor, 0);
      }, 0);

    return {
      totalDia,
      dinheiro: sumByMethod("dinheiro"),
      credito: sumByMethod("credito"),
      debito: sumByMethod("debito"),
      pix: sumByMethod("pix"),
      entradasExtras,
      saidas,
    };
  }, [fechamentos, movimentacoesCaixa]);

  const mesaLogs = useMemo(
    () => (mesa ? eventos.filter((evento) => evento.mesaId === mesa.id) : []),
    [eventos, mesa],
  );

  const totalConta = mesa?.total ?? 0;
  const totalContaCents = toCents(totalConta);
  const totalPago = useMemo(() => closingPayments.reduce((acc, pagamento) => acc + pagamento.valor, 0), [closingPayments]);
  const totalPagoCents = toCents(totalPago);
  const valorRestante = Math.max((totalContaCents - totalPagoCents) / 100, 0);
  const fechamentoPronto = totalContaCents > 0 && totalPagoCents === totalContaCents;

  const resetCloseAccountState = useCallback(() => {
    setConfirmFechar(false);
    setClosingPayments([]);
    setClosingPaymentMethod("dinheiro");
    setClosingPaymentValue("");
  }, []);

  const handleVoltar = useCallback(() => {
    setMesaSelecionada(null);
    resetCloseAccountState();
  }, [resetCloseAccountState]);

  const handleSelecionarMesa = useCallback(
    (mesaId: string) => {
      dismissChamarGarcom(mesaId);
      setMesaSelecionada(mesaId);
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

  if (!currentOperator) {
    return (
      <AppLayout title={accessMode === "gerente" ? "Gerente" : "Caixa"}>
        <OperationalAccessCard role={accessMode} />
      </AppLayout>
    );
  }

  const hasSomethingToClose = Boolean(mesa && (mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0));

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
      {
        id: `pag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        formaPagamento: closingPaymentMethod,
        valor: Number(valor.toFixed(2)),
      },
    ]);
    setClosingPaymentValue("");
  };

  const handleRemovePayment = (paymentId: string) => {
    setClosingPayments((prev) => prev.filter((payment) => payment.id !== paymentId));
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
    resetCloseAccountState();
  };

  const handleUnlockFinance = async () => {
    if (!financeManagerName.trim()) {
      setFinanceError("Informe o nome do gerente");
      return;
    }

    if (!/^\d{4,6}$/.test(financeManagerPin)) {
      setFinanceError("Informe o PIN do gerente");
      return;
    }

    setIsUnlockingFinance(true);
    setFinanceError(null);
    const result = await verifyManagerAccess(financeManagerName, financeManagerPin);

    if (!result.ok) {
      setFinanceError(result.error ?? "Não foi possível validar o gerente");
      setIsUnlockingFinance(false);
      return;
    }

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

  const handlePrepareTabletBinding = () => {
    const mesaNumero = Number(tabletTargetMesaNumber);

    if (!Number.isInteger(mesaNumero) || mesaNumero < 1) {
      toast.error("Informe um número de mesa válido", { duration: 1400 });
      return;
    }

    const proximaMesa = mesas.find((item) => item.numero === mesaNumero);
    if (!proximaMesa) {
      toast.error("Mesa não encontrada para este tablet", { duration: 1400 });
      return;
    }

    if (tabletMesaId === proximaMesa.id) {
      toast.error("O tablet já está vinculado a esta mesa", { duration: 1400 });
      return;
    }

    openCriticalAction({
      type: "vincular_tablet",
      mesaId: tabletMesa?.id ?? null,
      mesaNumero: tabletMesa?.numero ?? null,
      proximaMesaId: proximaMesa.id,
      proximaMesaNumero: proximaMesa.numero,
    });
  };

  const getCriticalActionCopy = () => {
    if (!criticalAction) return null;

    switch (criticalAction.type) {
      case "zerar_mesa":
        return {
          title: "Autorizar zeragem da mesa",
          description: `Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")} será limpa por completo.`,
          buttonLabel: "Autorizar zeragem",
        };
      case "cancelar_pedido":
        return {
          title: "Autorizar cancelamento do pedido",
          description: `Pedido #${criticalAction.pedidoNumero} da Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")}.`,
          buttonLabel: "Autorizar cancelamento",
        };
      case "remover_item_carrinho":
        return {
          title: "Autorizar exclusão de item pendente",
          description: `${criticalAction.itemNome} será removido da Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")}.`,
          buttonLabel: "Autorizar exclusão",
        };
      case "remover_item_pedido":
        return {
          title: "Autorizar exclusão de item do pedido",
          description: `${criticalAction.itemNome} será removido do Pedido #${criticalAction.pedidoNumero}.`,
          buttonLabel: "Autorizar exclusão",
        };
      case "desvincular_tablet":
        return {
          title: "Autorizar desvínculo do tablet",
          description: `O terminal será liberado da Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")}.`,
          buttonLabel: "Desvincular tablet",
        };
      case "vincular_tablet":
        return {
          title: criticalAction.mesaNumero ? "Autorizar troca de mesa do tablet" : "Autorizar vínculo do tablet",
          description: criticalAction.mesaNumero
            ? `O terminal sairá da Mesa ${String(criticalAction.mesaNumero).padStart(2, "0")} e irá para a Mesa ${String(criticalAction.proximaMesaNumero).padStart(2, "0")}.`
            : `O terminal será vinculado à Mesa ${String(criticalAction.proximaMesaNumero).padStart(2, "0")}.`,
          buttonLabel: criticalAction.mesaNumero ? "Trocar mesa do tablet" : "Vincular tablet",
        };
      default:
        return null;
    }
  };

  const handleConfirmCriticalAction = async () => {
    if (!criticalAction) return;

    if (!criticalManagerName.trim()) {
      setCriticalError("Informe o nome do gerente");
      return;
    }

    if (!/^\d{4,6}$/.test(criticalManagerPin)) {
      setCriticalError("Informe o PIN do gerente");
      return;
    }

    if (criticalReason.trim().length < 4) {
      setCriticalError("Informe um motivo com pelo menos 4 caracteres");
      return;
    }

    setIsAuthorizingCriticalAction(true);
    setCriticalError(null);
    const result = await verifyManagerAccess(criticalManagerName, criticalManagerPin);

    if (!result.ok) {
      setCriticalError(result.error ?? "Não foi possível validar o gerente");
      setIsAuthorizingCriticalAction(false);
      return;
    }

    const motivo = criticalReason.trim();

      switch (criticalAction.type) {
      case "zerar_mesa":
        zerarMesa(criticalAction.mesaId, { usuario: currentOperator, motivo });
        setMesaSelecionada(null);
        setConfirmFechar(false);
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
        ajustarItemPedido(criticalAction.mesaId, criticalAction.pedidoId, criticalAction.itemUid, -criticalAction.quantidade, {
          usuario: currentOperator,
          motivo,
        });
        toast.success("Item removido com autorização do gerente", { duration: 1200, icon: "🗑️" });
        break;
      case "desvincular_tablet":
        clearBoundTabletMesaId();
        clearTabletLoginUser();
        setTabletMesaId(null);
        setTabletTargetMesaNumber("");
        toast.success("Tablet desvinculado e retorno ao login liberado", { duration: 1200, icon: "📱" });
        break;
      case "vincular_tablet": {
        const mesaVinculada = setBoundTabletMesaId(criticalAction.proximaMesaId);
        setTabletMesaId(mesaVinculada);
        setTabletTargetMesaNumber("");
        toast.success(`Tablet vinculado à Mesa ${String(criticalAction.proximaMesaNumero).padStart(2, "0")}`, { duration: 1200, icon: "🔐" });
        break;
      }
    }

    resetCriticalDialog();
  };

  return (
    <>
      <AppLayout
        title={screenTitle}
        headerRight={
          <Button variant="outline" onClick={() => logout(accessMode)} className="gap-2 rounded-xl font-bold">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        }
      >
        {!mesa ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
              <p className="text-sm font-bold text-foreground">
                {accessMode === "gerente" ? "Gerente logado" : "Caixa logado"}: {currentOperator.nome}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {accessMode === "gerente"
                  ? "Acesso completo para relatórios financeiros, fechamento e auditoria operacional."
                  : "A operação diária mostra apenas mesas, pedidos, pagamentos e fechamento por mesa, sem faturamento total."}
              </p>
            </div>

            <Tabs defaultValue="mesas" className="w-full">
              <TabsList className={`grid h-auto w-full rounded-2xl bg-secondary p-1 ${accessMode === "gerente" ? "grid-cols-3" : "grid-cols-2"}`}>
                <TabsTrigger value="mesas" className="rounded-xl py-2.5 font-bold">Mesas</TabsTrigger>
                {accessMode === "gerente" && (
                  <TabsTrigger value="fechamento" className="rounded-xl py-2.5 font-bold">Fechamento do Caixa</TabsTrigger>
                )}
                <TabsTrigger value="logs" className="rounded-xl py-2.5 font-bold">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="mesas" className="mt-4">
                <div className="flex flex-col gap-4">
                  <h2 className="px-1 text-base font-bold text-foreground">Lista de mesas</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5">
                    {mesas.map((item) => (
                      <MesaCard
                        key={item.id}
                        mesa={item}
                        onClick={() => handleSelecionarMesa(item.id)}
                        showTotal
                      />
                    ))}
                  </div>

                  {accessMode === "gerente" && tabletMesa && (
                    <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                      Tablet atualmente vinculado à Mesa <span className="font-black text-foreground">{String(tabletMesa.numero).padStart(2, "0")}</span>.
                      Clique na mesa para desvincular ou trocar o terminal com autenticação do gerente.
                    </div>
                  )}
                </div>
              </TabsContent>

              {accessMode === "gerente" && (
                <TabsContent value="fechamento" className="mt-4">
                  {!financeUnlocked ? (
                    <div className="surface-card mx-auto flex max-w-lg flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                          <LockKeyhole className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-foreground">Relatórios protegidos</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Para visualizar o fechamento completo do caixa, valide o gerente já cadastrado neste dispositivo.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
                        <Input value={financeManagerName} onChange={(event) => setFinanceManagerName(event.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
                        <Input
                          value={financeManagerPin}
                          onChange={(event) => setFinanceManagerPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="4 a 6 dígitos"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                        />
                      </div>

                      {financeError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{financeError}</p>}

                      <Button onClick={handleUnlockFinance} className="h-12 rounded-xl text-base font-black" disabled={isUnlockingFinance}>
                        <ShieldCheck className="h-4 w-4" />
                        Liberar fechamento completo
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="surface-card p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total do dia</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.totalDia)}</p>
                      </div>
                      <div className="surface-card p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Dinheiro</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.dinheiro)}</p>
                      </div>
                      <div className="surface-card p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Crédito</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.credito)}</p>
                      </div>
                      <div className="surface-card p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Débito</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.debito)}</p>
                      </div>
                      <div className="surface-card p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">PIX</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.pix)}</p>
                      </div>
                      <div className="surface-card p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Entradas extras</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.entradasExtras)}</p>
                      </div>
                      <div className="surface-card p-4 md:col-span-2 xl:col-span-3">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Saídas</p>
                        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumoFinanceiro.saidas)}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="logs" className="mt-4">
                <div className="surface-card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-black text-foreground">Log de ações</h2>
                  </div>

                  <div className="space-y-3">
                    {eventos.length === 0 ? (
                      <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                        Ainda não há eventos registrados.
                      </div>
                    ) : (
                      eventos.map((evento) => (
                        <div key={evento.id} className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">{evento.descricao}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Quem: {evento.usuarioNome ?? "Sistema"}</span>
                                <span>Ação: {actionLabels[evento.acao ?? ""] ?? evento.tipo}</span>
                                <span>Mesa: {evento.mesaId ? evento.mesaId.replace("mesa-", "") : "—"}</span>
                                <span>Item: {evento.itemNome ?? "—"}</span>
                                <span>Motivo: {evento.motivo ?? "—"}</span>
                                <span>Horário: {evento.criadoEm}</span>
                              </div>
                            </div>
                            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                              {actionLabels[evento.acao ?? ""] ?? evento.tipo}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            <div className="surface-card grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Mesa {String(mesa.numero).padStart(2, "0")}
                </span>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <StatusBadge status={mesa.status} />
                  <span className="text-3xl font-black text-foreground">{formatPrice(mesa.total)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Operador atual: {currentOperator.nome}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleVoltar} className="rounded-xl font-bold">
                  Mesas
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openCriticalAction({ type: "zerar_mesa", mesaId: mesa.id, mesaNumero: mesa.numero })}
                  className="rounded-xl font-bold"
                >
                  <RotateCcw className="h-4 w-4" />
                  Zerar mesa
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirmFechar) {
                      resetCloseAccountState();
                      return;
                    }
                    setConfirmFechar(true);
                  }}
                  disabled={!hasSomethingToClose}
                  className="rounded-xl font-black"
                >
                  Fechar conta
                </Button>
              </div>
            </div>

            {accessMode === "gerente" && (
              <div className="surface-card flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Operação do tablet</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {tabletMesaId === mesa.id
                        ? "Este tablet está vinculado à mesa atual. Você pode desvincular ou trocar para outra mesa com autenticação do gerente."
                        : tabletMesa
                          ? `O tablet está vinculado à Mesa ${String(tabletMesa.numero).padStart(2, "0")}.`
                          : "Nenhum tablet está vinculado neste momento."}
                    </p>
                  </div>
                </div>

                {tabletMesaId === mesa.id ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Trocar para outra mesa</label>
                        <Input
                          value={tabletTargetMesaNumber}
                          onChange={(event) => setTabletTargetMesaNumber(event.target.value.replace(/\D/g, "").slice(0, 2))}
                          placeholder="Ex.: 12"
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      </div>
                      <Button type="button" onClick={handlePrepareTabletBinding} className="rounded-xl font-black">
                        Trocar para outra mesa
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openCriticalAction({ type: "desvincular_tablet", mesaId: mesa.id, mesaNumero: mesa.numero })}
                        className="rounded-xl font-bold"
                      >
                        Desvincular tablet
                      </Button>
                    </div>
                  </>
                ) : tabletMesa ? (
                  <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-foreground">
                    Para trocar o tablet para esta mesa, abra a Mesa {String(tabletMesa.numero).padStart(2, "0")} e use a opção de troca.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-foreground">
                    O tablet será vinculado inicialmente pelo próprio fluxo do cliente no primeiro acesso.
                  </div>
                )}
              </div>
            )}

            {confirmFechar && (
              <div className="surface-card flex flex-col gap-5 p-5">
                <div>
                  <p className="text-base font-black text-foreground">Fechamento com múltiplos pagamentos</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mesa {String(mesa.numero).padStart(2, "0")} • Operador {currentOperator.nome}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total da conta</p>
                    <p className="mt-2 text-xl font-black text-foreground">{formatPrice(totalConta)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total pago</p>
                    <p className="mt-2 text-xl font-black text-foreground">{formatPrice(totalPago)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Valor restante</p>
                    <p className="mt-2 text-xl font-black text-foreground">{formatPrice(valorRestante)}</p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Forma</label>
                    <Select value={closingPaymentMethod} onValueChange={(value) => setClosingPaymentMethod(value as PaymentMethod)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione a forma" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Valor</label>
                    <Input
                      value={closingPaymentValue}
                      onChange={(event) => setClosingPaymentValue(event.target.value)}
                      placeholder="Ex.: 25,00"
                      inputMode="decimal"
                      autoComplete="off"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddPayment}
                    disabled={valorRestante === 0}
                    className="rounded-xl font-black"
                  >
                    + Adicionar pagamento
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Pagamentos adicionados</p>
                  {closingPayments.length === 0 ? (
                    <div className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
                      Nenhum pagamento adicionado ainda.
                    </div>
                  ) : (
                    closingPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                        <div>
                          <p className="text-sm font-bold text-foreground">{getPaymentMethodLabel(payment.formaPagamento)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatPrice(payment.valor)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleRemovePayment(payment.id)}
                          className="rounded-xl font-bold"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  O fechamento só será liberado quando o total pago for exatamente igual ao total da conta.
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetCloseAccountState} className="flex-1 rounded-xl font-bold">
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleFechar}
                    disabled={!fechamentoPronto || closingPayments.length === 0}
                    className="flex-1 rounded-xl font-black"
                  >
                    Confirmar fechamento
                  </Button>
                </div>
              </div>
            )}

            <div className="surface-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-foreground">Histórico de pedidos da mesa</h2>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Somente pedidos e total da mesa</p>
              </div>
              <div className="space-y-4">
                {mesa.pedidos.length === 0 ? (
                  <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                    Nenhum pedido confirmado nesta mesa.
                  </div>
                ) : (
                  mesa.pedidos.map((pedido) => (
                    <div key={pedido.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">Pedido #{pedido.numeroPedido}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {pedido.origem === "garcom"
                              ? `Lançado por ${pedido.garcomNome ?? "garçom identificado"}`
                              : "Lançado pelo cliente"}
                            {` • Enviado às ${pedido.criadoEm}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-foreground">{formatPrice(pedido.total)}</span>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl font-bold"
                            onClick={() =>
                              openCriticalAction({
                                type: "cancelar_pedido",
                                mesaId: mesa.id,
                                mesaNumero: mesa.numero,
                                pedidoId: pedido.id,
                                pedidoNumero: pedido.numeroPedido,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Cancelar pedido
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {pedido.itens.map((item) => (
                          <div key={item.uid} className="flex items-start justify-between gap-3 rounded-xl bg-secondary p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{item.quantidade}x {item.nome}</p>
                              {item.adicionais.length > 0 && (
                                <p className="mt-1 text-xs text-primary">+ {item.adicionais.map((adicional) => adicional.nome).join(", ")}</p>
                              )}
                              {item.removidos.length > 0 && (
                                <p className="text-xs text-destructive">Sem {item.removidos.join(", ")}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() =>
                                  item.quantidade === 1
                                    ? openCriticalAction({
                                        type: "remover_item_pedido",
                                        mesaId: mesa.id,
                                        mesaNumero: mesa.numero,
                                        pedidoId: pedido.id,
                                        pedidoNumero: pedido.numeroPedido,
                                        itemUid: item.uid,
                                        itemNome: item.nome,
                                        quantidade: item.quantidade,
                                      })
                                    : ajustarItemPedido(mesa.id, pedido.id, item.uid, -1, { usuario: currentOperator })
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => ajustarItemPedido(mesa.id, pedido.id, item.uid, 1, { usuario: currentOperator })}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="rounded-xl"
                                onClick={() =>
                                  openCriticalAction({
                                    type: "remover_item_pedido",
                                    mesaId: mesa.id,
                                    mesaNumero: mesa.numero,
                                    pedidoId: pedido.id,
                                    pedidoNumero: pedido.numeroPedido,
                                    itemUid: item.uid,
                                    itemNome: item.nome,
                                    quantidade: item.quantidade,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="surface-card p-5">
              <h2 className="mb-4 text-lg font-black text-foreground">Itens pendentes no carrinho</h2>
              <div className="space-y-3">
                {mesa.carrinho.length === 0 ? (
                  <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                    Nenhum item pendente no carrinho desta mesa.
                  </div>
                ) : (
                  mesa.carrinho.map((item) => (
                    <div key={item.uid} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.quantidade}x {item.nome}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Subtotal pendente: {formatPrice(item.precoUnitario * item.quantidade)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() =>
                            item.quantidade === 1
                              ? openCriticalAction({
                                  type: "remover_item_carrinho",
                                  mesaId: mesa.id,
                                  mesaNumero: mesa.numero,
                                  itemUid: item.uid,
                                  itemNome: item.nome,
                                })
                              : updateCartItemQty(mesa.id, item.uid, -1, { usuario: currentOperator })
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => updateCartItemQty(mesa.id, item.uid, 1, { usuario: currentOperator })}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="rounded-xl"
                          onClick={() =>
                            openCriticalAction({
                              type: "remover_item_carrinho",
                              mesaId: mesa.id,
                              mesaNumero: mesa.numero,
                              itemUid: item.uid,
                              itemNome: item.nome,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="surface-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-black text-foreground">Log visível da mesa</h2>
              </div>
              <div className="space-y-3">
                {mesaLogs.length === 0 ? (
                  <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                    Ainda não há ações registradas para esta mesa.
                  </div>
                ) : (
                  mesaLogs.map((evento) => (
                    <div key={evento.id} className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm font-semibold text-foreground">{evento.descricao}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Quem: {evento.usuarioNome ?? "Sistema"}</span>
                        <span>Item: {evento.itemNome ?? "—"}</span>
                        <span>Motivo: {evento.motivo ?? "—"}</span>
                        <span>Horário: {evento.criadoEm}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AppLayout>

      <Dialog open={Boolean(criticalAction)} onOpenChange={(open) => !open && resetCriticalDialog()}>
        <DialogContent className="rounded-2xl border-border bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{getCriticalActionCopy()?.title}</DialogTitle>
            <DialogDescription>{getCriticalActionCopy()?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {criticalAction?.type === "vincular_tablet" && (
              <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-sm text-foreground">
                <p className="font-semibold">Destino do tablet: Mesa {String(criticalAction.proximaMesaNumero).padStart(2, "0")}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Nome do gerente</label>
              <Input value={criticalManagerName} onChange={(event) => setCriticalManagerName(event.target.value)} placeholder="Ex.: Mariana" maxLength={40} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">PIN do gerente</label>
              <Input
                value={criticalManagerPin}
                onChange={(event) => setCriticalManagerPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="4 a 6 dígitos"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Motivo da ação</label>
              <Textarea
                value={criticalReason}
                onChange={(event) => setCriticalReason(event.target.value)}
                placeholder="Descreva o motivo obrigatório desta ação"
                maxLength={180}
                className="min-h-[110px] rounded-xl"
              />
            </div>

            {criticalError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{criticalError}</p>}
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={resetCriticalDialog} className="rounded-xl font-bold">
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleConfirmCriticalAction} className="rounded-xl font-black" disabled={isAuthorizingCriticalAction}>
              {getCriticalActionCopy()?.buttonLabel ?? "Autorizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CaixaPage;
