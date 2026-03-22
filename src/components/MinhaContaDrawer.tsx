import { useEffect, useState } from "react";
import { Minus, Plus, Wallet } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PedidoRealizado } from "@/contexts/RestaurantContext";

interface MinhaContaDrawerProps {
  pedidos: PedidoRealizado[];
  total: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const MinhaContaDrawer = ({ pedidos, total, open, onOpenChange }: MinhaContaDrawerProps) => {
  const [numeroDePessoas, setNumeroDePessoas] = useState(1);

  useEffect(() => {
    if (!open) {
      setNumeroDePessoas(1);
    }
  }, [open]);

  const valorPorPessoa = total / numeroDePessoas;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col border-border bg-card p-0 max-w-full sm:max-w-full">
        <SheetHeader className="border-b border-border p-5 pb-4 text-left">
          <SheetTitle className="text-xl font-black text-foreground">Minha Conta</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Consulte os pedidos enviados e simule a divisão da conta sem alterar o pedido real.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 border-b border-border p-4">
          <div className="rounded-2xl bg-secondary p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Valor total acumulado
            </p>
            <p className="mt-2 text-3xl font-black text-foreground">{formatPrice(total)}</p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">Dividir conta</p>
                <p className="text-xs text-muted-foreground">A divisão é apenas visual.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNumeroDePessoas((prev) => Math.max(1, prev - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-transform active:scale-95"
                  aria-label="Diminuir número de pessoas"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex h-10 min-w-12 items-center justify-center rounded-xl border border-border bg-card px-3 text-base font-black text-foreground">
                  {numeroDePessoas}
                </div>
                <button
                  type="button"
                  onClick={() => setNumeroDePessoas((prev) => prev + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-foreground transition-transform active:scale-95"
                  aria-label="Aumentar número de pessoas"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-secondary px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Cada pessoa paga</p>
              <p className="mt-1 text-xl font-black text-foreground">{formatPrice(valorPorPessoa)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-sm font-bold text-foreground">Pedidos enviados</p>

          {pedidos.length === 0 ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-2xl bg-secondary p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background text-muted-foreground">
                <Wallet className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground">Nenhum pedido enviado ainda</p>
                <p className="text-sm text-muted-foreground">
                  Assim que os pedidos forem enviados, eles aparecerão aqui para consulta.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="space-y-3 rounded-2xl bg-secondary p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">Pedido #{pedido.numeroPedido}</p>
                      <p className="text-xs text-muted-foreground">Enviado às {pedido.criadoEm}</p>
                    </div>
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground">
                      {pedido.itens.length} {pedido.itens.length === 1 ? "item" : "itens"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {pedido.itens.map((item) => (
                      <div key={item.uid} className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {item.quantidade}x {item.nome}
                          </p>
                          {item.adicionais.length > 0 && (
                            <p className="text-xs text-primary">
                              + {item.adicionais.map((adicional) => adicional.nome).join(", ")}
                            </p>
                          )}
                          {item.removidos.length > 0 && (
                            <p className="text-xs text-destructive">Sem {item.removidos.join(", ")}</p>
                          )}
                          {item.bebida && <p className="text-xs text-muted-foreground">Bebida: {item.bebida}</p>}
                          {item.tipo && <p className="text-xs text-muted-foreground">Tipo: {item.tipo}</p>}
                          {item.embalagem && (
                            <p className="text-xs text-muted-foreground">Embalagem: {item.embalagem}</p>
                          )}
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground">Obs.: {item.observacoes}</p>
                          )}
                        </div>
                        <span className="whitespace-nowrap text-sm font-black text-foreground">
                          {formatPrice(item.precoUnitario * item.quantidade)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs font-medium text-muted-foreground">Total do pedido</span>
                    <span className="text-base font-black text-foreground">{formatPrice(pedido.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MinhaContaDrawer;
