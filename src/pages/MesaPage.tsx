import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import { produtos } from "@/data/menuData";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import CartDrawer from "@/components/CartDrawer";
import MenuOverlay from "@/components/MenuOverlay";
import StickyOrderButton from "@/components/StickyOrderButton";
import { Plus, Minus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMesa, addToCart, updateCartItemQty, removeFromCart, confirmarPedido, dismissChamarGarcom } = useRestaurant();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [highlightedInvalidItems, setHighlightedInvalidItems] = useState<string[]>([]);

  const mesa = getMesa(id || "");
  const carrinho = mesa?.carrinho ?? [];

  const invalidItemIds = useMemo(() => {
    return carrinho
      .filter((item) => {
        const produto = produtos.find((p) => p.id === item.produtoId) as
          | (typeof produtos)[number] & { opcoesObrigatorias?: string[]; minimoObrigatorio?: number }
          | undefined;
        const minimoObrigatorio = produto?.minimoObrigatorio ?? produto?.opcoesObrigatorias?.length ?? 0;
        const totalOpcoesSelecionadas = item.removidos.length + item.adicionais.length;
        const hasValidRequiredSelection = totalOpcoesSelecionadas >= minimoObrigatorio;

        return item.quantidade <= 0 || !hasValidRequiredSelection;
      })
      .map((item) => item.uid);
  }, [carrinho]);

  useEffect(() => {
    setHighlightedInvalidItems((prev) => prev.filter((uid) => invalidItemIds.includes(uid)));
  }, [invalidItemIds]);

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

  const validatePendingCart = useCallback(() => {
    if (invalidItemIds.length === 0) return true;

    setHighlightedInvalidItems(invalidItemIds);
    toast.error("Revise o pedido antes de enviar", { duration: 1400 });
    return false;
  }, [invalidItemIds]);

  const handleConfirmar = useCallback(() => {
    if (!id) return false;
    if (!validatePendingCart()) return false;

    confirmarPedido(id);
    setHighlightedInvalidItems([]);
    toast.success("Pedido enviado", { duration: 1200, icon: "✅" });
    return true;
  }, [id, confirmarPedido, validatePendingCart]);

  const handleBack = useCallback(() => {
    if (carrinho.length > 0) {
      setShowExitAlert(true);
    } else {
      navigate(-1);
    }
  }, [carrinho.length, navigate]);

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
        onBack={handleBack}
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
          {/* Resumo rápido */}
          <div className="surface-card p-5 flex items-center gap-4">
            <StatusBadge status={mesa.status} />
            <div className="h-8 w-px bg-border" />
            <span className="text-foreground text-2xl font-black tabular-nums flex-1">
              {formatPrice(mesa.total)}
            </span>
            {mesa.pedidos.length > 0 && (
              <span className="text-muted-foreground text-xs font-semibold tabular-nums">
                {mesa.pedidos.length} pedido{mesa.pedidos.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Alerta carrinho pendente */}
          {carrinho.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-status-pendente/30 bg-status-pendente/5">
              <span className="text-status-pendente text-sm font-bold">
                ⚠ {carrinho.length} {carrinho.length === 1 ? "item aguardando" : "itens aguardando"} envio
              </span>
            </div>
          )}

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
              {carrinho.map((item) => {
                const isInvalid = highlightedInvalidItems.includes(item.uid);

                return (
                  <div
                    key={item.uid}
                    className={`surface-card p-4 flex items-start gap-3 border transition-colors ${
                      isInvalid ? "border-destructive/40 bg-destructive/5" : "border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium">
                        {item.nome}
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
                      {isInvalid && (
                        <p className="text-destructive text-xs font-semibold mt-1">
                          Revise este item antes de enviar
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs mt-1 tabular-nums">
                        {formatPrice(item.precoUnitario * item.quantidade)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (item.quantidade <= 1) {
                            removeFromCart(id!, item.uid);
                          } else {
                            updateCartItemQty(id!, item.uid, -1);
                          }
                        }}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item.quantidade <= 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-foreground text-sm font-bold tabular-nums w-6 text-center">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => updateCartItemQty(id!, item.uid, 1)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
        onValidate={validatePendingCart}
      />

      {/* Exit alert for pending cart items */}
      <AlertDialog open={showExitAlert} onOpenChange={setShowExitAlert}>
        <AlertDialogContent className="bg-card border-border max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-status-pendente" />
              Itens não enviados
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Existem {carrinho.length} {carrinho.length === 1 ? "item" : "itens"} no carrinho que ainda não {carrinho.length === 1 ? "foi enviado" : "foram enviados"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">
              Voltar e revisar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate(-1)}
              className="rounded-xl font-bold bg-secondary text-foreground hover:bg-secondary/80"
            >
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MesaPage;
