import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Props {
  total: number;
  onOpenCart: () => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const StickyOrderButton = ({ total, onOpenCart }: Props) => {
  const isEmpty = total <= 0;

  const handleClick = useCallback(() => {
    if (isEmpty) return;
    onOpenCart();
  }, [isEmpty, onOpenCart]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <Button
        onClick={handleClick}
        disabled={isEmpty}
        className="w-full max-w-lg mx-auto h-14 rounded-2xl text-lg font-black gap-2 shadow-xl shadow-primary/30 pointer-events-auto flex transition-all disabled:opacity-50"
      >
        <Send className="w-5 h-5" />
        {isEmpty ? "Nenhum item no carrinho" : `Revisar Pedido — ${formatPrice(total)}`}
      </Button>
    </div>
  );
};

export default StickyOrderButton;
