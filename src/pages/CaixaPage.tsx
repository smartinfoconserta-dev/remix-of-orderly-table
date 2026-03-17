import { useState, useCallback } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import MesaCard from "@/components/MesaCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const CaixaPage = () => {
  const { mesas, fecharConta } = useRestaurant();
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  const [confirmFechar, setConfirmFechar] = useState(false);

  const mesasAtivas = mesas.filter((m) => m.status !== "livre");
  const mesa = mesaSelecionada ? mesas.find((m) => m.id === mesaSelecionada) : null;

  const handleFechar = useCallback(() => {
    if (!mesaSelecionada) return;
    fecharConta(mesaSelecionada);
    toast.success("Conta finalizada", { duration: 1500, icon: "✅" });
    setMesaSelecionada(null);
    setConfirmFechar(false);
  }, [mesaSelecionada, fecharConta]);

  return (
    <AppLayout title="Caixa" showBack>
      {!mesa ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-foreground text-base font-bold px-1">Mesas Ativas</h2>
          {mesasAtivas.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <span className="text-4xl">✅</span>
              <p className="text-muted-foreground text-base font-medium">
                Nenhuma mesa ativa
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {mesasAtivas.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMesaSelecionada(m.id)}
                  className="surface-card p-5 flex flex-col items-center gap-2 min-h-[120px] active:scale-[0.97] transition-transform"
                >
                  <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">
                    Mesa
                  </span>
                  <span className="text-foreground text-3xl font-black tabular-nums">
                    {String(m.numero).padStart(2, "0")}
                  </span>
                  <StatusBadge status={m.status} />
                  <span className="text-primary text-lg font-black mt-1">
                    {formatPrice(m.total)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-lg mx-auto">
          {/* Header da mesa */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setMesaSelecionada(null); setConfirmFechar(false); }}
              className="text-primary text-sm font-bold"
            >
              ← Voltar às mesas
            </button>
          </div>

          <div className="surface-card p-6 flex flex-col items-center gap-3">
            <span className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold">
              Mesa {String(mesa.numero).padStart(2, "0")}
            </span>
            <StatusBadge status={mesa.status} />
            <span className="text-foreground text-3xl font-black tabular-nums">
              {formatPrice(mesa.total)}
            </span>
            <span className="text-muted-foreground text-sm">
              {mesa.pedidos.length} pedido{mesa.pedidos.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Lista de pedidos */}
          {mesa.pedidos.map((pedido) => (
            <div key={pedido.id} className="bg-secondary rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm font-bold">
                  Pedido #{pedido.numeroPedido}
                </span>
                <span className="text-muted-foreground text-xs font-medium">
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
                <span className="text-muted-foreground text-xs font-medium">Total</span>
                <span className="text-foreground text-base font-black">
                  {formatPrice(pedido.total)}
                </span>
              </div>
            </div>
          ))}

          {/* Carrinho pendente */}
          {mesa.carrinho.length > 0 && (
            <div className="surface-card p-4 rounded-xl">
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">
                Itens pendentes no carrinho
              </p>
              {mesa.carrinho.map((item) => (
                <p key={item.uid} className="text-foreground text-sm">
                  {item.quantidade}x {item.nome}
                </p>
              ))}
            </div>
          )}

          {/* Finalizar conta */}
          {!confirmFechar ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmFechar(true)}
              className="w-full h-14 rounded-xl text-lg font-black"
            >
              Finalizar Conta — {formatPrice(mesa.total)}
            </Button>
          ) : (
            <div className="surface-card p-5 flex flex-col gap-4 items-center">
              <p className="text-foreground text-base font-bold text-center">
                Confirmar fechamento da Mesa {String(mesa.numero).padStart(2, "0")}?
              </p>
              <p className="text-muted-foreground text-sm text-center">
                Total: {formatPrice(mesa.total)}
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
                  Confirmar
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
