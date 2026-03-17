import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Check } from "lucide-react";

interface Props {
  total: number;
  onConfirmar: () => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const StickyOrderButton = ({ total, onConfirmar }: Props) => {
  const [sending, setSending] = useState(false);
  const lockRef = useRef(false);
  const isEmpty = total <= 0;

  const handleClick = useCallback(() => {
    if (lockRef.current || isEmpty) return;
    lockRef.current = true;
    setSending(true);
    onConfirmar();
    setTimeout(() => {
      setSending(false);
      lockRef.current = false;
    }, 2000);
  }, [onConfirmar, isEmpty]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <Button
        onClick={handleClick}
        disabled={isEmpty || sending}
        className="w-full max-w-lg mx-auto h-14 rounded-2xl text-lg font-black gap-2 shadow-xl shadow-primary/30 pointer-events-auto flex transition-all disabled:opacity-50"
      >
        {sending ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        {sending
          ? "Pedido enviado ✓"
          : isEmpty
          ? "Nenhum item no carrinho"
          : `Enviar Pedido — ${formatPrice(total)}`}
      </Button>
    </div>
  );
};

export default StickyOrderButton;
