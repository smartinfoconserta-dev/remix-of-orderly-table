import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
const MIN_SUBMIT_LOADING_MS = 800;

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
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setSubmitSuccess(false);
    }
  }, [open]);

  const handleConfirmar = async () => {
    if (carrinho.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    const startedAt = Date.now();
    let shouldShowSuccess = false;

    try {
      const result = await onConfirmar();
      shouldShowSuccess = result !== false;
    } catch {
      shouldShowSuccess = false;
    }

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_SUBMIT_LOADING_MS - elapsed);

    if (remaining > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }

    setIsSubmitting(false);

    if (!shouldShowSuccess) return;
    setSubmitSuccess(true);
  };

  const handleSuccessOk = () => {
    onOpenChange?.(false);
    setSubmitSuccess(false);
    onSuccessAcknowledge?.();
  };

  return (
    <>
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

        <SheetContent side="right" className="flex w-full flex-col border-border bg-card p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-5 pb-3">
            <SheetTitle className="text-xl font-black text-foreground">Carrinho do pedido</SheetTitle>
          </SheetHeader>

          {carrinho.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
              <p className="text-base font-medium text-muted-foreground">Carrinho vazio</p>
              <p className="text-center text-sm text-muted-foreground">Adicione itens pelo fluxo guiado para montar o pedido.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {carrinho.map((item) => (
                  <div key={item.uid} className="space-y-3 rounded-2xl bg-secondary p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-foreground">{item.nome}</h4>
                        {item.adicionais.length > 0 && (
                          <p className="mt-0.5 text-xs text-primary">+ {item.adicionais.map((a) => a.nome).join(", ")}</p>
                        )}
                        {item.removidos.length > 0 && (
                          <p className="mt-0.5 text-xs text-destructive">Sem {item.removidos.join(", ")}</p>
                        )}
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

              <div className="space-y-3 border-t border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-black text-foreground">{formatPrice(subtotal)}</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
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
                    disabled={isSubmitting}
                    className="h-12 rounded-2xl font-black transition-transform duration-100 ease-in-out active:scale-[0.97]"
                  >
                    Enviar pedido
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isSubmitting}>
        <DialogContent
          overlayClassName="bg-foreground/75 backdrop-blur-sm"
          className="w-auto max-w-none border-0 bg-transparent p-0 shadow-none [&>button]:hidden"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <LoaderCircle className="h-12 w-12 animate-spin text-primary-foreground" />
            <h3 className="text-2xl font-black text-primary-foreground">Enviando pedido...</h3>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={submitSuccess}>
        <DialogContent className="max-w-sm border-border bg-card p-8 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary animate-in zoom-in-50 fade-in-0 duration-300 ease-in-out">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black text-foreground">Pedido enviado com sucesso</h3>
            <Button onClick={handleSuccessOk} className="h-12 w-full rounded-2xl text-base font-black transition-transform duration-100 ease-in-out active:scale-[0.97]">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CartDrawer;
