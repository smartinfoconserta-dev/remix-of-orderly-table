import { useParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import CartDrawer from "@/components/CartDrawer";
import MenuOverlay from "@/components/MenuOverlay";
import StickyOrderButton from "@/components/StickyOrderButton";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const MesaPage = () => {
  const { getMesa, addToCart, updateCartItemQty, removeFromCart, confirmarPedido, dismissChamarGarcom } = useRestaurant();
  const [menuOpen, setMenuOpen] = useState(false);

  const mesa = getMesa(id || "");
  const carrinho = mesa?.carrinho ?? [];

  // Auto-dismiss chamar garçom when opening mesa
  useEffect(() => {
    if (mesa?.chamarGarcom && id) {
      dismissChamarGarcom(id);
    }
  }, [mesa?.chamarGarcom, id, dismissChamarGarcom]);

  const handleAddItem = useCallback(
    (item: ItemCarrinho) => {
      if (!id) return;
      addToCart(id, item);
      toast.success("Item adicionado!", { duration: 1000, icon: "✅" });
    },
    [id, addToCart]
  );

  const handleConfirmar = useCallback(() => {
    if (!id) return;
    confirmarPedido(id);
    toast.success("Pedido confirmado!", { duration: 1500, icon: "🎉" });
  }, [id, confirmarPedido]);

  if (!mesa) {
    return (
      <AppLayout title="Mesa não encontrada" showBack>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Mesa não encontrada.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout
        title={`Mesa ${String(mesa.numero).padStart(2, "0")}`}
        showBack
        headerRight={
          <div className="flex items-center gap-2">
            <CartDrawer
              carrinho={carrinho}
              onUpdateQty={(uid, delta) => updateCartItemQty(id!, uid, delta)}
              onRemove={(uid) => removeFromCart(id!, uid)}
              onConfirmar={handleConfirmar}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-6 max-w-lg mx-auto">
          {/* Status Card */}
          <div className="surface-card p-6 flex flex-col items-center gap-4">
            <span className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold">
              Status
            </span>
            <StatusBadge status={mesa.status} />
          </div>

          {/* Resumo */}
          <div className="surface-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">Total</span>
              <span className="text-foreground text-2xl font-black tabular-nums">
                {formatPrice(mesa.total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">Pedidos</span>
              <span className="text-foreground text-lg font-bold tabular-nums">
                {mesa.pedidos.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-medium">Itens no carrinho</span>
              <span className="text-foreground text-lg font-bold tabular-nums">
                {carrinho.length}
              </span>
            </div>
          </div>

          {/* Botão Adicionar Itens */}
          <Button
            onClick={() => setMenuOpen(true)}
            className="w-full h-14 rounded-xl text-lg font-black gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar Itens
          </Button>

          {/* Histórico de Pedidos */}
          {mesa.pedidos.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-foreground text-base font-bold px-1">Histórico de Pedidos</h2>
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
                    <span className="text-muted-foreground text-xs font-medium">Total do pedido</span>
                    <span className="text-foreground text-base font-black">
                      {formatPrice(pedido.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Carrinho pendente */}
          {carrinho.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-foreground text-base font-bold px-1">Carrinho Pendente</h2>
              {carrinho.map((item) => (
                <div key={item.uid} className="surface-card p-4 flex items-start justify-between gap-2">
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
          )}

          {carrinho.length > 0 && <div className="h-20" />}
        </div>
      </AppLayout>

      {/* Menu overlay fullscreen */}
      <MenuOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAddItem={handleAddItem}
      />

      <StickyOrderButton
        total={carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0)}
        onConfirmar={handleConfirmar}
      />
    </>
  );
};

export default MesaPage;
