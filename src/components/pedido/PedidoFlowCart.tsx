import { ShoppingCart } from "lucide-react";
import CartDrawer from "@/components/CartDrawer";
import { type ItemCarrinho } from "@/contexts/RestaurantContext";
import { formatPrice } from "@/components/caixa/caixaHelpers";

interface PedidoFlowCartProps {
  carrinho: ItemCarrinho[];
  onUpdateQty: (uid: string, delta: number) => void;
  onRemoveItem: (uid: string) => void;
  onConfirmar: () => Promise<boolean>;
  onContinueOrdering: () => void;
  onSuccessAcknowledge: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hideTrigger: boolean;
  modo: "cliente" | "garcom" | "caixa" | "balcao" | "delivery" | "totem";
  isTotemMode: boolean;
  /** Show mobile sticky bar */
  showStickyBar: boolean;
  onStickyBarClick: () => void;
}

const PedidoFlowCart = ({
  carrinho,
  onUpdateQty,
  onRemoveItem,
  onConfirmar,
  onContinueOrdering,
  onSuccessAcknowledge,
  open,
  onOpenChange,
  hideTrigger,
  modo,
  isTotemMode,
  showStickyBar,
  onStickyBarClick,
}: PedidoFlowCartProps) => {
  const cartItemCount = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const cartTotal = carrinho.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);

  return (
    <>
      <CartDrawer
        carrinho={carrinho}
        onUpdateQty={onUpdateQty}
        onRemove={onRemoveItem}
        onConfirmar={onConfirmar}
        onContinueOrdering={onContinueOrdering}
        onSuccessAcknowledge={onSuccessAcknowledge}
        open={open}
        onOpenChange={onOpenChange}
        hideTrigger={hideTrigger}
        modo={modo}
        isTotemMode={isTotemMode}
      />

      {/* Mobile / garcom / totem sticky bar */}
      {showStickyBar && carrinho.length > 0 && !open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onStickyBarClick}
            className={`w-full flex items-center justify-between gap-3 rounded-2xl px-5 py-4 shadow-lg active:scale-[0.98] transition-transform ${
              isTotemMode
                ? "bg-primary text-primary-foreground"
                : "bg-primary text-primary-foreground shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.6)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className={`absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  isTotemMode ? "bg-white text-[#FF6B00]" : "bg-white text-primary"
                }`}>
                  {cartItemCount}
                </span>
              </div>
              <span className="text-base font-black uppercase">{isTotemMode ? "CONTINUAR" : "Ver carrinho"}</span>
            </div>
            <span className="text-base font-black tabular-nums">
              {formatPrice(cartTotal)}
            </span>
          </button>
        </div>
      )}
    </>
  );
};

export default PedidoFlowCart;
