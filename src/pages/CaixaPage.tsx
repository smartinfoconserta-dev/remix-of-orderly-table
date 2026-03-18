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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import type { PaymentMethod, UserRole } from "@/types/operations";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

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
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>("dinheiro");
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

  const currentOperator = accessMode === "gerente" ? currentGerente : currentCaixa;
  const screenTitle = mesa
    ? `Mesa ${String(mesa.numero).padStart(2, "0")}`
    : accessMode === "gerente"
      ? "Gerente"
      : "Caixa";

  const mesa = mesaSelecionada ? mesas.find((item) => item.id === mesaSelecionada) ?? null : null;

  const resumoFinanceiro = useMemo(() => {
    const totalDia = fechamentos.reduce((acc, fechamento) => acc + fechamento.total, 0);
    const entradasExtras = movimentacoesCaixa
      .filter((movimentacao) => movimentacao.tipo === "entrada")
      .reduce((acc, movimentacao) => acc + movimentacao.valor, 0);
    const saidas = movimentacoesCaixa
      .filter((movimentacao) => movimentacao.tipo === "saida")
      .reduce((acc, movimentacao) => acc + movimentacao.valor, 0);

    return {
      totalDia,
      dinheiro: fechamentos
        .filter((fechamento) => fechamento.formaPagamento === "dinheiro")
        .reduce((acc, fechamento) => acc + fechamento.total, 0),
      credito: fechamentos
        .filter((fechamento) => fechamento.formaPagamento === "credito")
        .reduce((acc, fechamento) => acc + fechamento.total, 0),
      debito: fechamentos
        .filter((fechamento) => fechamento.formaPagamento === "debito")
        .reduce((acc, fechamento) => acc + fechamento.total, 0),
      pix: fechamentos
        .filter((fechamento) => fechamento.formaPagamento === "pix")
        .reduce((acc, fechamento) => acc + fechamento.total, 0),
      entradasExtras,
      saidas,
    };
  }, [fechamentos, movimentacoesCaixa]);

  const mesaLogs = useMemo(
    () => (mesa ? eventos.filter((evento) => evento.mesaId === mesa.id) : []),
    [eventos, mesa],
  );

  const handleVoltar = useCallback(() => {
    setMesaSelecionada(null);
    setConfirmFechar(false);
    setFormaPagamento("dinheiro");
  }, []);

  const handleSelecionarMesa = useCallback(
    (mesaId: string) => {
      dismissChamarGarcom(mesaId);
      setMesaSelecionada(mesaId);
      setConfirmFechar(false);
      setFormaPagamento("dinheiro");
    },
    [dismissChamarGarcom],
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
      <AppLayout title={accessMode === "gerente" ? "Gerente" : "Caixa"} showBack>
        <OperationalAccessCard role={accessMode} />
      </AppLayout>
    );
  }

  const hasSomethingToClose = Boolean(mesa && (mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0));

  const handleFechar = () => {
    if (!mesaSelecionada) return;
    fecharConta(mesaSelecionada, { usuario: currentOperator, formaPagamento });
    toast.success("Conta fechada com registro da forma de pagamento", { duration: 1400, icon: "✅" });
    setMesaSelecionada(null);
    setConfirmFechar(false);
    setFormaPagamento("dinheiro");
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
    }

    resetCriticalDialog();
  };

  return (
    <>
      <AppLayout
        title={screenTitle}
        showBack
        onBack={mesa ? handleVoltar : undefined}
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
                  onClick={() => setConfirmFechar((prev) => !prev)}
                  disabled={!hasSomethingToClose}
                  className="rounded-xl font-black"
                >
                  Fechar conta
                </Button>
              </div>
            </div>

            {confirmFechar && (
              <div className="surface-card flex flex-col gap-4 p-5">
                <div>
                  <p className="text-base font-black text-foreground">Confirmar fechamento da conta?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mesa {String(mesa.numero).padStart(2, "0")} • Total {formatPrice(mesa.total)} • Operador {currentOperator.nome}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Forma de pagamento</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {paymentMethodOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={formaPagamento === option.value ? "default" : "outline"}
                          className="rounded-xl font-bold"
                          onClick={() => setFormaPagamento(option.value)}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setConfirmFechar(false)} className="flex-1 rounded-xl font-bold">
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleFechar} className="flex-1 rounded-xl font-black">
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
                            {` • ${pedido.criadoEm}`}
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
