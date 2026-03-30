import { useCallback } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/components/caixa/caixaHelpers";

interface Props {
  total: number;
  itemCount?: number;
  onOpenCart: () => void;
  label?: string;
}

const StickyOrderButton = ({ total, itemCount = 0, onOpenCart, label }: Props) => {
  const isEmpty = total <= 0 || itemCount <= 0;

  const handleClick = useCallback(() => {
    if (isEmpty) return;
    onOpenCart();
  }, [isEmpty, onOpenCart]);

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button
        onClick={handleClick}
        disabled={isEmpty}
        className="pointer-events-auto mx-auto flex h-[4.75rem] w-full max-w-lg items-center justify-between rounded-[1.6rem] border border-border bg-card px-3 py-3 text-left shadow-[0_24px_48px_-24px_hsl(var(--foreground)/0.95)] transition-all hover:bg-card disabled:opacity-100 disabled:hover:bg-card"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_16px_28px_-18px_hsl(var(--primary)/0.95)]">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-foreground">
              {isEmpty ? "Carrinho vazio" : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
            </span>
            <span className="block text-xs font-medium text-muted-foreground">
              {isEmpty ? "Adicione produtos para continuar" : formatPrice(total)}
            </span>
          </span>
        </span>

        <span className="shrink-0 rounded-2xl bg-primary px-4 py-3 text-base font-black text-primary-foreground shadow-[0_16px_30px_-18px_hsl(var(--primary)/0.9)]">
          {label ?? "Ver carrinho"}
        </span>
      </Button>
    </div>
  );
};

export default StickyOrderButton;
