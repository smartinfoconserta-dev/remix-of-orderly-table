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
}: Props) => {
  const subtotal = carrinho.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [showSubmittingOverlay, setShowSubmittingOverlay] = useState(false);
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
      setShowSuccessFeedback(false);
      setShowSubmittingOverlay(false);
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

  const drawerMarkup = open ? (
    <div className="fixed inset-0 z-[80] animate-fade-in">
      <button
        type="button"
        aria-label="Fechar carrinho"
        onClick={() => {
          if (!showSuccessFeedback && !showSubmittingOverlay) onOpenChange?.(false);
        }}
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
      />

      <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-slide-in-right">
        {!showSuccessFeedback && !showSubmittingOverlay ? (
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform active:scale-95"
            aria-label="Fechar carrinho"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {showSubmittingOverlay ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-card/95 p-6 text-center animate-enter">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_hsl(var(--primary)/0.2)]">
              <span className="absolute inset-0 rounded-full border border-primary/25 pulse" />
              <LoaderCircle className="relative z-10 h-11 w-11 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">Enviando pedido...</h3>
              <p className="text-sm text-muted-foreground">Estamos confirmando os itens e registrando o pedido com segurança.</p>
            </div>
          </div>
        ) : showSuccessFeedback ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center animate-enter">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_36px_hsl(var(--primary)/0.18)]">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground">Pedido enviado com sucesso</h3>
              <p className="text-sm text-muted-foreground">Seu pedido foi recebido e o sistema voltou para um estado seguro de operação.</p>
            </div>
            <Button type="button" onClick={handleSuccessOk} className="h-12 w-full rounded-2xl font-black">
              OK
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border p-5 pb-4 pr-16 text-left animate-fade-in">
              <h2 className="text-xl font-black text-foreground">Carrinho do pedido</h2>
              <p className="text-sm text-muted-foreground">
                {carrinho.length > 0
                  ? "Os itens abaixo ainda não foram enviados para a cozinha."
                  : "Seu carrinho está vazio no momento. Adicione itens para montar o pedido."}
              </p>
            </div>

            {carrinho.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center animate-fade-in">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
                <p className="text-base font-medium text-muted-foreground">Carrinho vazio</p>
                <p className="text-sm text-muted-foreground">Abra um produto, personalize e adicione ao pedido para continuar.</p>
              </div>
            ) : (
              <>
                <div className="border-b border-border px-4 pb-4 pt-4 animate-fade-in">
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary">Itens pendentes</p>
                    <p className="mt-1 text-sm text-foreground">Revise os itens com calma antes de enviar o pedido para a cozinha.</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-40">
                  {carrinho.map((item, index) => (
                    <div
                      key={item.uid}
                      className="space-y-3 rounded-2xl border border-primary/20 bg-secondary p-4 shadow-sm transition-colors animate-fade-in"
                      style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                            Pendente
                          </span>
                          <h4 className="mt-2 text-sm font-bold text-foreground">{item.nome}</h4>
                          {item.adicionais.length > 0 && <p className="mt-0.5 text-xs text-primary">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>}
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

                <div className="absolute inset-x-0 bottom-0 border-t border-border bg-card p-4 animate-fade-in">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-muted-foreground">Subtotal</span>
                      <span className="text-xl font-black text-foreground">{formatPrice(subtotal)}</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting || showSubmittingOverlay}
                        onClick={() => {
                          onContinueOrdering?.();
                          onOpenChange?.(false);
                        }}
                        className="h-12 rounded-2xl font-bold"
                      >
                        Adicionar mais itens
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmar}
                        disabled={isSubmitting || isLocked || showSubmittingOverlay}
                        className="h-12 rounded-2xl font-black"
                      >
                        {isSubmitting || showSubmittingOverlay ? (
                          <span className="inline-flex items-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Enviando...
                          </span>
                        ) : isLocked ? (
                          "Aguarde 2s"
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