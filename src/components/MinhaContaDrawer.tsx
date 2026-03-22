import { useEffect, useState } from "react";
import { Minus, Plus, Receipt, ShoppingCart, Users, X } from "lucide-react";
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
    if (!open) setNumeroDePessoas(1);
  }, [open]);

  if (!open) return null;

  const valorPorPessoa = total / numeroDePessoas;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">Minha Conta</h2>
            <p className="text-xs text-muted-foreground">Pedidos enviados</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="h-9 w-9 flex items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground active:scale-95 transition-transform">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Total + Dividir */}
      <div className="border-b border-border px-4 py-3 shrink-0 bg-secondary/30">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total acumulado</p>
            <p className="text-2xl font-black text-foreground tabular-nums">{formatPrice(total)}</p>
          </div>
          <div className="shrink-0 space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">Dividir conta</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setNumeroDePessoas(prev => Math.max(1, prev - 1))}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-secondary text-foreground active:scale-90 transition-transform disabled:opacity-40"
                  disabled={numeroDePessoas <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-base font-black text-foreground tabular-nums">
                  {numeroDePessoas}
                </span>
                <button
                  onClick={() => setNumeroDePessoas(prev => prev + 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-secondary text-foreground active:scale-90 transition-transform"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="w-20 text-right">
                <p className="text-[10px] text-muted-foreground">Cada um</p>
                <p className={`text-base font-black tabular-nums transition-colors ${
                  numeroDePessoas > 1 ? "text-primary" : "text-muted-foreground/25"
                }`}>
                  {formatPrice(valorPorPessoa)}
                </p>
              </div>
            </div>
          </div>
          {numeroDePessoas > 1 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(numeroDePessoas, 10) }).map((_, i) => (
                <div key={i} className="h-5 w-1.5 rounded-full bg-primary/60" />
              ))}
              {numeroDePessoas > 10 && (
                <span className="text-[10px] font-bold text-primary ml-1">+{numeroDePessoas - 10}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm font-bold text-muted-foreground">Nenhum pedido enviado ainda</p>
            <p className="text-xs text-muted-foreground">Adicione itens e envie para a cozinha.</p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-black text-foreground text-sm">Pedido #{pedido.numeroPedido}</span>
                  <span>às {pedido.criadoEm}</span>
                </div>
                <span className="text-sm font-black text-foreground tabular-nums">{formatPrice(pedido.total)}</span>
              </div>
              <div className="divide-y divide-border/40">
                {pedido.itens.map((item) => (
                  <div key={item.uid} className="flex items-center gap-3 py-2 px-3">
                    <div className="shrink-0 h-12 w-12 rounded-xl overflow-hidden border border-border bg-secondary">
                      {item.imagemUrl ? (
                        <img src={item.imagemUrl} alt={item.nome} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground leading-tight">
                        {item.quantidade}× {item.nome}
                      </p>
                      {item.adicionais.length > 0 && (
                        <p className="text-xs text-primary mt-0.5 leading-tight">
                          + {item.adicionais.map(a => a.nome).join(", ")}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-xs text-destructive mt-0.5 leading-tight">
                          Sem {item.removidos.join(", ")}
                        </p>
                      )}
                      {item.observacoes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">"{item.observacoes}"</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-black text-foreground tabular-nums">
                      {formatPrice(item.precoUnitario * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MinhaContaDrawer;
