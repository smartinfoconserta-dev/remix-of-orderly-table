import { useState, useCallback } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import MesaCard from "@/components/MesaCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const CaixaPage = () => {
  const { mesas, fecharConta, dismissChamarGarcom } = useRestaurant();
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [confirmFechar, setConfirmFechar] = useState(false);

  const mesa = mesaSelecionada ? mesas.find((m) => m.id === mesaSelecionada) : null;
  const hasSomethingToClose = Boolean(
    mesa && (mesa.total > 0 || mesa.pedidos.length > 0 || mesa.carrinho.length > 0)
  );

  const handleVoltar = useCallback(() => {
    setMesaSelecionada(null);
    setConfirmFechar(false);
  }, []);

  const handleSelecionarMesa = useCallback(
    (mesaId: string) => {
      dismissChamarGarcom(mesaId);
      setMesaSelecionada(mesaId);
      setConfirmFechar(false);
    },
    [dismissChamarGarcom]
  );

  const handleFechar = useCallback(() => {
    if (!mesaSelecionada) return;
    fecharConta(mesaSelecionada);
    toast.success("Mesa encerrada", { duration: 1500, icon: "✅" });
    setMesaSelecionada(null);
    setConfirmFechar(false);
  }, [mesaSelecionada, fecharConta]);

  return (
    <AppLayout
      title={mesa ? `Mesa ${String(mesa.numero).padStart(2, "0")}` : "Caixa"}
      showBack
      onBack={mesa ? handleVoltar : undefined}
    >
      {!mesa ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-foreground text-base font-bold px-1">Mesas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {mesas.map((m) => (
              <MesaCard
                key={m.id}
                mesa={m}
                onClick={() => handleSelecionarMesa(m.id)}
                showTotal
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-lg mx-auto">
          <div className="surface-card p-6 flex flex-col items-center gap-3 text-center">
            <span className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold">
              Mesa {String(mesa.numero).padStart(2, "0")}
            </span>
            <StatusBadge status={mesa.status} />
            <span className="text-foreground text-4xl font-black tabular-nums">
              {formatPrice(mesa.total)}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-foreground text-base font-bold px-1">Histórico Completo</h2>
            {mesa.pedidos.length === 0 ? (
              <div className="surface-card p-5 text-center">
                <p className="text-muted-foreground text-sm font-medium">
                  Nenhum pedido lançado nesta mesa.
                </p>
              </div>
            ) : (
              mesa.pedidos.map((pedido) => (
                <div key={pedido.id} className="bg-secondary rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-foreground text-sm font-bold">
                      Pedido #{pedido.numeroPedido}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                      {pedido.criadoEm}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pedido.itens.map((item) => (
                      <div key={item.uid} className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium">
                            {item.quantidade}x {item.nome}
                          </p>
                          {item.adicionais.length > 0 && (
                            <p className="text-primary text-xs">
                              + {item.adicionais.map((a) => a.nome).join(", ")}
                            </p>
                          )}
                          {item.removidos.length > 0 && (
                            <p className="text-destructive text-xs">
                              Sem {item.removidos.join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="text-foreground text-sm font-bold whitespace-nowrap">
                          {formatPrice(item.precoUnitario * item.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">Total do pedido</span>
                    <span className="text-foreground text-base font-black">
                      {formatPrice(pedido.total)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {mesa.carrinho.length > 0 && (
            <div className="surface-card p-4 rounded-xl border border-status-pendente/30 bg-status-pendente/5">
              <p className="text-status-pendente text-xs font-bold uppercase tracking-wider mb-2">
                Itens pendentes no carrinho
              </p>
              <div className="space-y-2">
                {mesa.carrinho.map((item) => (
                  <div key={item.uid} className="flex items-start justify-between gap-2">
                    <p className="text-foreground text-sm">
                      {item.quantidade}x {item.nome}
                    </p>
                    <span className="text-foreground text-sm font-bold whitespace-nowrap">
                      {formatPrice(item.precoUnitario * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface-card p-5 flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-bold uppercase tracking-wide">
              Total geral
            </span>
            <span className="text-foreground text-2xl font-black tabular-nums">
              {formatPrice(mesa.total)}
            </span>
          </div>

          {!confirmFechar ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmFechar(true)}
              disabled={!hasSomethingToClose}
              className="w-full h-14 rounded-xl text-lg font-black"
            >
              Fechar Conta
            </Button>
          ) : (
            <div className="surface-card p-5 flex flex-col gap-4 items-center">
              <p className="text-foreground text-base font-bold text-center">
                Confirmar fechamento da mesa?
              </p>
              <p className="text-muted-foreground text-sm text-center">
                Mesa {String(mesa.numero).padStart(2, "0")} • Total {formatPrice(mesa.total)}
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setConfirmFechar(false)}
                  className="flex-1 h-12 rounded-xl text-base font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleFechar}
                  className="flex-1 h-12 rounded-xl text-base font-black"
                >
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default CaixaPage;
