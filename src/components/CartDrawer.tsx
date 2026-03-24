import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, LoaderCircle, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface Props {
  carrinho: ItemCarrinho[];
  onUpdateQty: (uid: string, delta: number) => void;
  onRemove: (uid: string) => void;
  onConfirmar: () => Promise<boolean | void> | boolean | void;
  onContinueOrdering?: () => void;
  onSuccessAcknowledge?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  modo?: "cliente" | "garcom" | "caixa" | "balcao" | "delivery" | "totem";
  isTotemMode?: boolean;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const SUBMIT_LOCK_MS = 2000;
const SUBMIT_LOADING_MS = 1500;

const CartDrawer = ({
  carrinho,
  onUpdateQty,
  onRemove,
  onConfirmar,
  onContinueOrdering,
  onSuccessAcknowledge,
  open = false,
  onOpenChange,
  hideTrigger = false,
  modo = "cliente",
  isTotemMode = false,
}: Props) => {
  const subtotal = carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [showSubmittingOverlay, setShowSubmittingOverlay] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const labelConfirmar = modo === "delivery" ? "Confirmar pedido" : "Enviar pedido";
  const labelConfirmarFinal = modo === "delivery" ? "Confirmar agora" : "Enviar agora";
  const [showConfirmEnvio, setShowConfirmEnvio] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const lockTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!showSuccessFeedback) { setCountdown(10); return; }
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); handleSuccessOk(); return 10; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showSuccessFeedback]);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setIsSubmitting(false);
      setIsLocked(false);
      setShowSuccessFeedback(false);
      setShowSubmittingOverlay(false);
      setIsClosing(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || showSuccessFeedback || showSubmittingOverlay) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange?.(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange, showSuccessFeedback, showSubmittingOverlay]);

  const handleOpenDrawer = () => {
    onOpenChange?.(true);
  };

  const handleConfirmar = async () => {
    if (carrinho.length === 0 || isSubmitting || isLocked || showSuccessFeedback || showSubmittingOverlay) return;

    setIsSubmitting(true);
    setIsLocked(true);
    setShowSubmittingOverlay(true);

    clearTimers();
    lockTimerRef.current = window.setTimeout(() => {
      setIsLocked(false);
      lockTimerRef.current = null;
    }, SUBMIT_LOCK_MS);

    let shouldShowSuccess = false;

    try {
      const [result] = await Promise.all([
        Promise.resolve(onConfirmar()),
        new Promise((resolve) => window.setTimeout(resolve, SUBMIT_LOADING_MS)),
      ]);
      shouldShowSuccess = result !== false;
    } catch {
      shouldShowSuccess = false;
    }

    setIsSubmitting(false);

    if (!shouldShowSuccess) {
      setShowSubmittingOverlay(false);
      return;
    }

    setShowSubmittingOverlay(false);
    setShowSuccessFeedback(true);
  };

  const handleSuccessOk = () => {
    setShowSuccessFeedback(false);
    onOpenChange?.(false);
    onSuccessAcknowledge?.();
  };

  const handleClose = () => {
    if (showSuccessFeedback || showSubmittingOverlay || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onOpenChange?.(false);
    }, 200);
  };

  const drawerMarkup = open ? (
    <div className={`fixed inset-0 z-[80] ${isClosing ? "backdrop-fade-out" : "animate-fade-in"}`}>
      <button
        type="button"
        aria-label="Fechar carrinho"
        onClick={handleClose}
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
      />

      <aside className={`absolute inset-y-0 right-0 flex h-full w-full flex-col border-l shadow-2xl ${isTotemMode ? "border-gray-200 bg-white" : "border-border bg-card"} ${isClosing ? "drawer-slide-out" : "animate-slide-in-right"}`}>



        {showSubmittingOverlay ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <ShoppingCart className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">Enviando pedido...</h3>
              <p className="text-sm text-muted-foreground">Aguarde, estamos registrando seus itens.</p>
            </div>
          </div>
        ) : showSuccessFeedback ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
              <CheckCircle2 className="h-12 w-12 text-emerald-500 relative z-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-foreground">Pedido enviado!</h3>
              <p className="text-base text-muted-foreground">A cozinha já recebeu seu pedido.</p>
            </div>
            <Button type="button" onClick={handleSuccessOk} className="h-14 px-10 rounded-2xl font-black text-base bg-emerald-600 hover:bg-emerald-700 text-white mx-auto">
              OK, obrigado!
            </Button>
            <p className="text-sm text-muted-foreground">Voltando ao cardápio em {countdown}s...</p>
          </div>
        ) : (
          <>
            {/* Header simples */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-black text-foreground">Carrinho</h2>
              <button type="button" onClick={handleClose}
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${isTotemMode ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-background text-muted-foreground border-border"} hover:text-foreground`}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {carrinho.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <ShoppingCart className="h-14 w-14 text-muted-foreground/20" />
                <p className="text-base font-bold text-muted-foreground">Carrinho vazio</p>
                <p className="text-sm text-muted-foreground">Adicione itens para começar.</p>
              </div>
            ) : (
              <>
                {/* Lista de itens com foto */}
                <div className="flex-1 overflow-y-auto">
                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 border-b border-border/50 bg-secondary/30">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Qtd</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Subtotal</span>
                  </div>
                  <div className="divide-y divide-border/40 pb-36">
                    {carrinho.map((item) => (
                      <div key={item.uid} className="flex items-center gap-3 px-4 py-3">
                        {/* Foto do produto */}
                        <div className="shrink-0 h-14 w-14 rounded-xl overflow-hidden border border-border bg-secondary">
                          {item.imagemUrl ? (
                            <img src={item.imagemUrl} alt={item.nome}
                              className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                              <ShoppingCart className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        {/* Nome e personalizações */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight truncate">{item.nome}</p>
                          {item.adicionais.length > 0 && (
                            <p className="text-xs text-primary leading-tight truncate">
                              + {item.adicionais.map(a => a.nome).join(", ")}
                            </p>
                          )}
                          {item.removidos.length > 0 && (
                            <p className="text-xs text-destructive leading-tight truncate">
                              Sem {item.removidos.join(", ")}
                            </p>
                          )}
                          {item.bebida && (
                            <p className="text-xs text-muted-foreground leading-tight">{item.bebida}</p>
                          )}
                          {item.embalagem && item.embalagem !== "Consumir na mesa" && (
                            <p className="text-xs text-amber-400 leading-tight">🛍️ Para viagem</p>
                          )}
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground leading-tight italic">"{item.observacoes}"</p>
                          )}
                        </div>

                        {/* Quantidade */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          <button type="button"
                            onClick={() => item.quantidade <= 1 ? onRemove(item.uid) : onUpdateQty(item.uid, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-foreground active:scale-90 transition-transform">
                            {item.quantidade <= 1
                              ? <Trash2 className="h-3 w-3 text-destructive" />
                              : <Minus className="h-3 w-3" />}
                          </button>
                          <span className="w-5 text-center text-sm font-black text-foreground tabular-nums">
                            {item.quantidade}
                          </span>
                          <button type="button"
                            onClick={() => onUpdateQty(item.uid, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-foreground active:scale-90 transition-transform">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="shrink-0 text-sm font-black text-foreground tabular-nums w-16 text-right">
                          {formatPrice(item.precoUnitario * item.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rodapé fixo */}
                <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card/98 backdrop-blur-sm px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {!showConfirmEnvio ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-muted-foreground">Valor a pagar</span>
                        <span className="text-xl font-black text-foreground tabular-nums">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button type="button" variant="outline"
                          disabled={isSubmitting || showSubmittingOverlay}
                          onClick={() => { onContinueOrdering?.(); onOpenChange?.(false); }}
                          className="h-12 rounded-2xl font-bold text-sm">
                          Adicionar mais itens
                        </Button>
                        <Button type="button"
                          disabled={isSubmitting || isLocked || showSubmittingOverlay}
                          onClick={() => setShowConfirmEnvio(true)}
                          className="h-12 rounded-2xl font-black text-sm">
                          {labelConfirmar}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-base font-black text-foreground">Tudo certo no pedido?</p>
                        <span className="text-xl font-black text-foreground tabular-nums">{formatPrice(subtotal)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Quer adicionar mais alguma coisa?</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button type="button" variant="outline"
                          onClick={() => setShowConfirmEnvio(false)}
                          className="h-12 rounded-2xl font-bold text-sm">
                          Não, adicionar mais
                        </Button>
                        <Button type="button"
                          onClick={() => { setShowConfirmEnvio(false); handleConfirmar(); }}
                          disabled={isSubmitting || isLocked || showSubmittingOverlay}
                          className="h-12 rounded-2xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white">
                          {isSubmitting ? (
                            <span className="inline-flex items-center gap-2">
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                              Enviando...
                            </span>
                          ) : "Sim, enviar!"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  ) : null;

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={handleOpenDrawer}
          className="relative flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-transform active:scale-95"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Ver carrinho</span>
          {totalItens > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-black text-destructive-foreground">
              {totalItens}
            </span>
          )}
        </button>
      ) : null}

      {typeof document !== "undefined" ? createPortal(drawerMarkup, document.body) : null}
    </>
  );
};

export default CartDrawer;