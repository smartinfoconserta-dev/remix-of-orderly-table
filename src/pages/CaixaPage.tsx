import { useCallback, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, LogOut, Minus, Plus, ReceiptText, RotateCcw, ScrollText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import MesaCard from "@/components/MesaCard";
import OperationalAccessCard from "@/components/OperationalAccessCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const CaixaPage = () => {
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
    registrarMovimentacaoCaixa,
  } = useRestaurant();
  const { currentCaixa, logout } = useAuth();
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [confirmZerar, setConfirmZerar] = useState(false);
  const [movimentacaoTipo, setMovimentacaoTipo] = useState<"entrada" | "saida">("entrada");
  const [movimentacaoDescricao, setMovimentacaoDescricao] = useState("");
  const [movimentacaoValor, setMovimentacaoValor] = useState("");

  const mesa = mesaSelecionada ? mesas.find((item) => item.id === mesaSelecionada) ?? null : null;

  const resumo = useMemo(() => {
    const totalVendido = fechamentos.reduce((acc, fechamento) => acc + fechamento.total, 0);
    const totalEntradas = movimentacoesCaixa
      .filter((movimentacao) => movimentacao.tipo === "entrada")
      .reduce((acc, movimentacao) => acc + movimentacao.valor, 0);
    const totalSaidas = movimentacoesCaixa
      .filter((movimentacao) => movimentacao.tipo === "saida")
      .reduce((acc, movimentacao) => acc + movimentacao.valor, 0);

    return {
      totalVendido,
      totalEntradas,
      totalSaidas,
      saldoBruto: totalVendido + totalEntradas - totalSaidas,
    };
  }, [fechamentos, movimentacoesCaixa]);

  const handleVoltar = useCallback(() => {
    setMesaSelecionada(null);
    setConfirmFechar(false);
    setConfirmZerar(false);
  }, []);

  const handleSelecionarMesa = useCallback(
    (mesaId: string) => {
      dismissChamarGarcom(mesaId);
      setMesaSelecionada(mesaId);
      setConfirmFechar(false);
      setConfirmZerar(false);
    },
    [dismissChamarGarcom],
  );

  if (!currentCaixa) {
    return (
      <AppLayout title="Caixa" showBack>
        <OperationalAccessCard role="caixa" />
      </AppLayout>
    );
  }

  const hasSomethingToClose = Boolean(mesa && (mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0));

  const handleFechar = () => {
    if (!mesaSelecionada) return;
    fecharConta(mesaSelecionada, currentCaixa);
    toast.success("Conta fechada e mesa zerada", { duration: 1400, icon: "✅" });
    setMesaSelecionada(null);
    setConfirmFechar(false);
  };

  const handleZerar = () => {
    if (!mesaSelecionada) return;
    zerarMesa(mesaSelecionada, currentCaixa);
    toast.success("Mesa zerada", { duration: 1200, icon: "🧹" });
    setMesaSelecionada(null);
    setConfirmZerar(false);
  };

  const handleRegistrarMovimentacao = () => {
    const valor = Number(movimentacaoValor.replace(",", "."));

    if (!movimentacaoDescricao.trim()) {
      toast.error("Informe a descrição da movimentação");
      return;
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    registrarMovimentacaoCaixa({
      tipo: movimentacaoTipo,
      descricao: movimentacaoDescricao,
      valor,
      usuario: currentCaixa,
    });

    setMovimentacaoDescricao("");
    setMovimentacaoValor("");
    toast.success("Movimentação registrada", { duration: 1200, icon: movimentacaoTipo === "entrada" ? "📥" : "📤" });
  };

  return (
    <AppLayout
      title={mesa ? `Mesa ${String(mesa.numero).padStart(2, "0")}` : "Caixa"}
      showBack
      onBack={mesa ? handleVoltar : undefined}
      headerRight={
        <Button variant="outline" onClick={() => logout("caixa")} className="gap-2 rounded-xl font-bold">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      }
    >
      {!mesa ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <p className="text-sm font-bold text-foreground">Caixa logado: {currentCaixa.nome}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fechamentos, ajustes, cancelamentos, zeragem de mesa e movimentações extras ficam registrados neste painel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="surface-card p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Total vendido</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumo.totalVendido)}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Entradas extras</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumo.totalEntradas)}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Saídas</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumo.totalSaidas)}</p>
            </div>
            <div className="surface-card p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Saldo bruto</p>
              <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(resumo.saldoBruto)}</p>
            </div>
          </div>

          <Tabs defaultValue="mesas" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-secondary p-1">
              <TabsTrigger value="mesas" className="rounded-xl py-2.5 font-bold">Mesas</TabsTrigger>
              <TabsTrigger value="movimentacoes" className="rounded-xl py-2.5 font-bold">Movimentações</TabsTrigger>
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

            <TabsContent value="movimentacoes" className="mt-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
                <div className="surface-card flex flex-col gap-4 p-5">
                  <div>
                    <h2 className="text-lg font-black text-foreground">Caixa administrativo</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Registre entradas e saídas manuais com operador, valor e horário.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={movimentacaoTipo === "entrada" ? "default" : "outline"}
                      className="rounded-xl font-bold"
                      onClick={() => setMovimentacaoTipo("entrada")}
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Entrada
                    </Button>
                    <Button
                      type="button"
                      variant={movimentacaoTipo === "saida" ? "destructive" : "outline"}
                      className="rounded-xl font-bold"
                      onClick={() => setMovimentacaoTipo("saida")}
                    >
                      <ArrowDownCircle className="h-4 w-4" />
                      Saída
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Descrição</label>
                    <Input value={movimentacaoDescricao} onChange={(event) => setMovimentacaoDescricao(event.target.value)} placeholder="Ex.: sangria, troco inicial, reposição" maxLength={80} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Valor</label>
                    <Input value={movimentacaoValor} onChange={(event) => setMovimentacaoValor(event.target.value.replace(/[^\d,]/g, ""))} placeholder="Ex.: 50,00" inputMode="decimal" />
                  </div>

                  <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    Operador responsável: <span className="font-bold text-foreground">{currentCaixa.nome}</span>
                  </div>

                  <Button onClick={handleRegistrarMovimentacao} className="h-12 rounded-xl text-base font-black">
                    Registrar movimentação
                  </Button>
                </div>

                <div className="surface-card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ReceiptText className="h-5 w-5 text-foreground" />
                    <h2 className="text-lg font-black text-foreground">Histórico de movimentações</h2>
                  </div>

                  <div className="space-y-3">
                    {movimentacoesCaixa.length === 0 ? (
                      <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                        Nenhuma movimentação extra registrada ainda.
                      </div>
                    ) : (
                      movimentacoesCaixa.map((movimentacao) => (
                        <div key={movimentacao.id} className="rounded-2xl border border-border bg-card p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{movimentacao.descricao}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {movimentacao.criadoEm} • {movimentacao.usuarioNome}
                              </p>
                            </div>
                            <span className="text-base font-black text-foreground">
                              {movimentacao.tipo === "saida" ? "- " : "+ "}
                              {formatPrice(movimentacao.valor)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <div className="surface-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-foreground" />
                  <h2 className="text-lg font-black text-foreground">Histórico operacional</h2>
                </div>

                <div className="space-y-3">
                  {eventos.length === 0 ? (
                    <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                      Ainda não há eventos registrados.
                    </div>
                  ) : (
                    eventos.map((evento) => (
                      <div key={evento.id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{evento.descricao}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{evento.criadoEm}</p>
                          </div>
                          <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                            {evento.tipo}
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
              <p className="mt-2 text-sm text-muted-foreground">Operador atual: {currentCaixa.nome}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setConfirmZerar((prev) => !prev)} className="rounded-xl font-bold">
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
                  Mesa {String(mesa.numero).padStart(2, "0")} • Total {formatPrice(mesa.total)} • Operador {currentCaixa.nome}
                </p>
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

          {confirmZerar && (
            <div className="surface-card flex flex-col gap-4 p-5">
              <div>
                <p className="text-base font-black text-foreground">Confirmar zeragem da mesa?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Esta ação limpa carrinho, pedidos, total e chamado de garçom da mesa atual.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setConfirmZerar(false)} className="flex-1 rounded-xl font-bold">
                  Voltar
                </Button>
                <Button variant="secondary" onClick={handleZerar} className="flex-1 rounded-xl font-black">
                  Confirmar zeragem
                </Button>
              </div>
            </div>
          )}

          <div className="surface-card p-5">
            <h2 className="mb-4 text-lg font-black text-foreground">Histórico de pedidos da mesa</h2>
            <div className="space-y-4">
              {mesa.pedidos.length === 0 ? (
                <div className="rounded-2xl bg-secondary p-5 text-sm text-muted-foreground">
                  Nenhum pedido confirmado nesta mesa.
                </div>
              ) : (
                mesa.pedidos.map((pedido) => (
                  <div key={pedido.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">Pedido #{pedido.numeroPedido}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pedido.origem === "garcom"
                            ? `Lançado por ${pedido.garcomNome ?? "garçom identificado"}`
                            : "Lançado pelo cliente"}
                          {` • ${pedido.criadoEm}`}
                        </p>
                      </div>
                      <span className="text-base font-black text-foreground">{formatPrice(pedido.total)}</span>
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
                              onClick={() => ajustarItemPedido(mesa.id, pedido.id, item.uid, -1, currentCaixa)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => ajustarItemPedido(mesa.id, pedido.id, item.uid, 1, currentCaixa)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="rounded-xl"
                              onClick={() => ajustarItemPedido(mesa.id, pedido.id, item.uid, -item.quantidade, currentCaixa)}
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
                        onClick={() => updateCartItemQty(mesa.id, item.uid, -1, currentCaixa)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => updateCartItemQty(mesa.id, item.uid, 1, currentCaixa)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => removeFromCart(mesa.id, item.uid, currentCaixa)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default CaixaPage;
