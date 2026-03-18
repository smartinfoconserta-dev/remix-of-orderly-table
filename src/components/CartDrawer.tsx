import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    if (!open) {
      clearTimers();
      setIsSubmitting(false);
      setIsLocked(false);
      setShowConfirmPrompt(false);
      setShowSuccessFeedback(false);
    }
  }, [open]);

  useEffect(() => {
    if (carrinho.length === 0 && !showSuccessFeedback) {
      setShowConfirmPrompt(false);
    }
  }, [carrinho.length, showSuccessFeedback]);

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && showSuccessFeedback) return;
    onOpenChange?.(nextOpen);
  };

  const handleOpenDrawer = () => {
    onOpenChange?.(true);
  };

  const handleRequestConfirm = () => {
    if (carrinho.length === 0 || isSubmitting || isLocked || showSuccessFeedback) return;
    setShowConfirmPrompt(true);
  };

  const handleConfirmar = async () => {
    if (carrinho.length === 0 || isSubmitting || isLocked || showSuccessFeedback) return;

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
  };

  const handleSuccessOk = () => {
    setShowSuccessFeedback(false);
    onOpenChange?.(false);
    onSuccessAcknowledge?.();
  };

  return (
    <>
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

      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className={`relative flex w-full flex-col border-border bg-card p-0 sm:max-w-md ${showSuccessFeedback ? "[&>button]:hidden" : ""}`}
          onEscapeKeyDown={showSuccessFeedback ? (event) => event.preventDefault() : undefined}
          onInteractOutside={showSuccessFeedback ? (event) => event.preventDefault() : undefined}
          onPointerDownOutside={showSuccessFeedback ? (event) => event.preventDefault() : undefined}
        >
          {showSuccessFeedback ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
              <div className="flex h-18 w-18 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground">Pedido enviado com sucesso</h3>
                <p className="text-sm text-muted-foreground">O pedido foi confirmado e o sistema já voltou para um estado seguro de operação.</p>
              </div>
              <Button type="button" onClick={handleSuccessOk} className="h-12 w-full rounded-2xl font-black">
                OK
              </Button>
            </div>
          ) : (
            <>
              <SheetHeader className="border-b border-border p-5 pb-4 text-left">
                <SheetTitle className="text-xl font-black text-foreground">Carrinho do pedido</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {carrinho.length > 0
                    ? "Os itens abaixo ainda não foram enviados para a cozinha."
                    : "Seu carrinho está vazio no momento. Adicione itens para montar o pedido."}
                </SheetDescription>
              </SheetHeader>

              {carrinho.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
                  <p className="text-base font-medium text-muted-foreground">Carrinho vazio</p>
                  <p className="text-sm text-muted-foreground">Abra um produto, personalize e adicione ao pedido para continuar.</p>
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
                            type="button"
                            onClick={() => onRemove(item.uid)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
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
                              type="button"
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
                        <div className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-2xl border border-border bg-secondary/70 p-3 duration-200">
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
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CartDrawer;
