import { useState } from "react";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  carrinho: ItemCarrinho[];
  onUpdateQty: (uid: string, delta: number) => void;
  onRemove: (uid: string) => void;
  onConfirmar: () => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const CartDrawer = ({ carrinho, onUpdateQty, onRemove, onConfirmar }: Props) => {
  const [open, setOpen] = useState(false);
  const subtotal = carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  const handleConfirmar = () => {
    onConfirmar();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base active:scale-95 transition-transform">
          <ShoppingCart className="w-5 h-5" />
          <span>Carrinho</span>
          {totalItens > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-xs font-black flex items-center justify-center">
              {totalItens}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border p-0 flex flex-col">
        <SheetHeader className="p-5 pb-3 border-b border-border">
          <SheetTitle className="text-foreground text-xl font-black">Seu Carrinho</SheetTitle>
        </SheetHeader>

        {carrinho.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30" />
            <p className="text-muted-foreground text-base font-medium">Carrinho vazio</p>
            <p className="text-muted-foreground text-sm text-center">
              Adicione itens do cardápio para começar
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {carrinho.map((item) => (
                <div key={item.uid} className="bg-secondary rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-foreground text-sm font-bold">{item.nome}</h4>
                      {item.adicionais.length > 0 && (
                        <p className="text-primary text-xs mt-0.5">
                          + {item.adicionais.map((a) => a.nome).join(", ")}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-destructive text-xs mt-0.5">
                          Sem {item.removidos.join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(item.uid)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (item.quantidade <= 1) {
                            onRemove(item.uid);
                          } else {
                            onUpdateQty(item.uid, -1);
                          }
                        }}
                        className="w-9 h-9 rounded-lg bg-background flex items-center justify-center text-foreground active:scale-90 transition-transform"
                      >
                        {item.quantidade <= 1 ? <Trash2 className="w-4 h-4 text-destructive" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="text-foreground text-base font-bold min-w-[2ch] text-center">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.uid, 1)}
                        className="w-9 h-9 rounded-lg bg-background flex items-center justify-center text-foreground active:scale-90 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-foreground text-base font-black">
                      {formatPrice(item.precoUnitario * item.quantidade)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-base font-medium">Subtotal</span>
                <span className="text-foreground text-xl font-black">{formatPrice(subtotal)}</span>
              </div>
              <Button
                onClick={handleConfirmar}
                className="w-full h-14 rounded-xl text-lg font-black"
              >
                Confirmar Pedido — {formatPrice(subtotal)}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
