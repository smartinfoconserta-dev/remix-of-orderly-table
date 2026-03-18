import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const SUBMIT_LOCK_MS = 2000;
const SUCCESS_FEEDBACK_MS = 1000;

const CartDrawer = ({
  carrinho,
  onUpdateQty,
  onRemove,
  onConfirmar,
  onContinueOrdering,
  onSuccessAcknowledge,
  open,
  onOpenChange,
}: Props) => {
  const subtotal = carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const lockTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setIsSubmitting(false);
      setIsLocked(false);
      setShowConfirmPrompt(false);
      setShowSuccessFeedback(false);
    }
  }, [open]);

  const handleRequestConfirm = () => {
    if (carrinho.length === 0 || isSubmitting || isLocked) return;
    setShowConfirmPrompt(true);
  };

  const handleConfirmar = async () => {
    if (carrinho.length === 0 || isSubmitting || isLocked) return;

    setShowConfirmPrompt(false);
    setIsSubmitting(true);
    setIsLocked(true);

    clearTimers();
    lockTimerRef.current = window.setTimeout(() => {
      setIsLocked(false);
      lockTimerRef.current = null;
    }, SUBMIT_LOCK_MS);

    let shouldShowSuccess = false;

    try {
      const result = await onConfirmar();
      shouldShowSuccess = result !== false;
    } catch {
      shouldShowSuccess = false;
    }

    setIsSubmitting(false);

    if (!shouldShowSuccess) return;

    setShowSuccessFeedback(true);
    successTimerRef.current = window.setTimeout(() => {
      setShowSuccessFeedback(false);
      onOpenChange?.(false);
      onSuccessAcknowledge?.();
      successTimerRef.current = null;
    }, SUCCESS_FEEDBACK_MS);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button className="relative flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-bold text-primary-foreground transition-transform active:scale-95">
          <ShoppingCart className="h-5 w-5" />
          <span>Ver carrinho</span>
          {totalItens > 0 && (
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-black text-destructive-foreground">
              {totalItens}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="relative flex w-full flex-col border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 pb-4">
          <SheetTitle className="text-xl font-black text-foreground">Carrinho do pedido</SheetTitle>
          {carrinho.length > 0 ? <p className="text-sm text-muted-foreground">Os itens abaixo ainda não foram enviados para a cozinha.</p> : null}
        </SheetHeader>

        {carrinho.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-base font-medium text-muted-foreground">Carrinho vazio</p>
            <p className="text-center text-sm text-muted-foreground">Adicione itens pelo fluxo guiado para montar o pedido.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-4 pb-4 pt-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Itens pendentes</p>
                <p className="mt-1 text-sm text-foreground">Revise os itens com calma antes de enviar o pedido para a cozinha.</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-40">
              {carrinho.map((item) => (
                <div key={item.uid} className="space-y-3 rounded-2xl border border-primary/20 bg-secondary p-4 shadow-sm transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                        Pendente
                      </span>
                      <h4 className="mt-2 text-sm font-bold text-foreground">{item.nome}</h4>
                      {item.adicionais.length > 0 && (
                        <p className="mt-0.5 text-xs text-primary">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>
                      )}
                      {item.removidos.length > 0 && <p className="mt-0.5 text-xs text-destructive">Sem {item.removidos.join(", ")}</p>}
                      {item.bebida && <p className="mt-0.5 text-xs text-muted-foreground">Bebida: {item.bebida}</p>}
                      {item.tipo && <p className="mt-0.5 text-xs text-muted-foreground">Tipo: {item.tipo}</p>}
                      {item.embalagem && <p className="mt-0.5 text-xs text-muted-foreground">Embalagem: {item.embalagem}</p>}
                      {item.observacoes && <p className="mt-0.5 text-xs text-muted-foreground">Obs.: {item.observacoes}</p>}
                    </div>
                    <button
                      onClick={() => onRemove(item.uid)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (item.quantidade <= 1) {
                            onRemove(item.uid);
                          } else {
                            onUpdateQty(item.uid, -1);
                          }
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-foreground transition-transform active:scale-90"
                      >
                        {item.quantidade <= 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                      </button>
                      <span className="min-w-[2ch] text-center text-base font-bold text-foreground">{item.quantidade}</span>
                      <button
                        onClick={() => onUpdateQty(item.uid, 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-foreground transition-transform active:scale-90"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-base font-black text-foreground">{formatPrice(item.precoUnitario * item.quantidade)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-black text-foreground">{formatPrice(subtotal)}</span>
                </div>

                {showConfirmPrompt ? (
                  <div className="rounded-2xl border border-border bg-secondary/70 p-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                    <p className="text-sm font-semibold text-foreground">Deseja enviar o pedido para a cozinha?</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="outline" onClick={() => setShowConfirmPrompt(false)} className="h-11 rounded-2xl font-bold">
                        Revisar pedido
                      </Button>
                      <Button type="button" onClick={handleConfirmar} disabled={isSubmitting || isLocked} className="h-11 rounded-2xl font-black">
                        {isSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Enviando...
                          </span>
                        ) : (
                          "Confirmar envio"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowConfirmPrompt(false);
                      onContinueOrdering?.();
                      onOpenChange?.(false);
                    }}
                    className="h-12 rounded-2xl font-bold"
                  >
                    Adicionar mais itens
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRequestConfirm}
                    disabled={isSubmitting || isLocked || showConfirmPrompt}
                    className="h-12 rounded-2xl font-black transition-transform duration-100 ease-in-out active:scale-[0.97]"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Enviando...
                      </span>
                    ) : isLocked ? (
                      "Aguarde 2s"
                    ) : showConfirmPrompt ? (
                      "Confirme abaixo"
                    ) : (
                      "Enviar pedido"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {showSuccessFeedback ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Pedido enviado para cozinha</p>
                <p className="text-xs text-muted-foreground">Tudo certo — o carrinho foi encaminhado.</p>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
