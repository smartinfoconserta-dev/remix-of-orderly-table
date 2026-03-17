import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Check } from "lucide-react";

interface Props {
  total: number;
  onConfirmar: () => boolean | void;
  onValidate?: () => boolean;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const StickyOrderButton = ({ total, onConfirmar, onValidate }: Props) => {
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const lockRef = useRef(false);
  const confirmTimeoutRef = useRef<number | null>(null);
  const sendingTimeoutRef = useRef<number | null>(null);
  const isEmpty = total <= 0;

  const clearConfirmTimeout = useCallback(() => {
    if (confirmTimeoutRef.current) {
      window.clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
  }, []);

  const clearSendingTimeout = useCallback(() => {
    if (sendingTimeoutRef.current) {
      window.clearTimeout(sendingTimeoutRef.current);
      sendingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearConfirmTimeout();
      clearSendingTimeout();
    };
  }, [clearConfirmTimeout, clearSendingTimeout]);

  useEffect(() => {
    if (isEmpty && confirming) {
      setConfirming(false);
      clearConfirmTimeout();
    }
  }, [isEmpty, confirming, clearConfirmTimeout]);

  const handleClick = useCallback(() => {
    if (lockRef.current || isEmpty) return;

    if (!confirming) {
      if (onValidate?.() === false) return;

      setConfirming(true);
      clearConfirmTimeout();
      confirmTimeoutRef.current = window.setTimeout(() => {
        setConfirming(false);
        confirmTimeoutRef.current = null;
      }, 3000);
      return;
    }

    clearConfirmTimeout();
    setConfirming(false);

    if (onValidate?.() === false) return;
    if (onConfirmar() === false) return;

    lockRef.current = true;
    setSending(true);

    clearSendingTimeout();
    sendingTimeoutRef.current = window.setTimeout(() => {
      setSending(false);
      lockRef.current = false;
      sendingTimeoutRef.current = null;
    }, 2000);
  }, [onConfirmar, onValidate, isEmpty, confirming, clearConfirmTimeout, clearSendingTimeout]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
      <Button
        onClick={handleClick}
        disabled={isEmpty || sending}
        className={`w-full max-w-lg mx-auto h-14 rounded-2xl text-lg font-black gap-2 shadow-xl pointer-events-auto flex transition-all disabled:opacity-50 ${
          confirming
            ? "bg-foreground text-background hover:bg-foreground/90 shadow-foreground/20"
            : "shadow-primary/30"
        }`}
      >
        {sending ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        {sending
          ? "Pedido enviado ✓"
          : isEmpty
          ? "Nenhum item no carrinho"
          : confirming
          ? `Confirmar envio — ${formatPrice(total)}`
          : `Enviar Pedido — ${formatPrice(total)}`}
      </Button>
    </div>
  );
};

export default StickyOrderButton;
