import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
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
      {/* Header compacto */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-foreground">Minha Conta</h2>
          <p className="text-xs text-muted-foreground">Pedidos enviados para a cozinha</p>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="h-9 w-9 flex items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Barra de total + dividir — compacta, numa linha só */}
      <div className="border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total acumulado</p>
            <p className="text-2xl font-black text-foreground tabular-nums">{formatPrice(total)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-muted-foreground">Dividir:</span>
            <button
              onClick={() => setNumeroDePessoas(prev => Math.max(1, prev - 1))}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-foreground active:scale-95 transition-transform"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2rem] text-center text-base font-black text-foreground tabular-nums">
              {numeroDePessoas}
            </span>
            <button
              onClick={() => setNumeroDePessoas(prev => prev + 1)}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-card text-foreground active:scale-95 transition-transform"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {numeroDePessoas > 1 && (
              <div className="ml-2 text-right">
                <p className="text-[10px] text-muted-foreground">Cada um</p>
                <p className="text-sm font-black text-primary tabular-nums">{formatPrice(valorPorPessoa)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de pedidos — ocupa o resto da tela com scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-bold text-muted-foreground">Nenhum pedido enviado ainda</p>
            <p className="text-xs text-muted-foreground">Adicione itens ao carrinho e envie para a cozinha.</p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <div key={pedido.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              {/* Cabeçalho do pedido — compacto */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-black text-foreground text-sm">Pedido #{pedido.numeroPedido}</span>
                  <span>{pedido.criadoEm}</span>
                </div>
                <span className="text-sm font-black text-foreground tabular-nums">{formatPrice(pedido.total)}</span>
              </div>
              {/* Itens — um por linha, compacto */}
              <div className="space-y-1">
                {pedido.itens.map((item) => (
                  <div key={item.uid} className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {item.quantidade}× {item.nome}
                      </p>
                      {item.adicionais.length > 0 && (
                        <p className="text-[10px] text-primary">+ {item.adicionais.map(a => a.nome).join(", ")}</p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-[10px] text-destructive">Sem {item.removidos.join(", ")}</p>
                      )}
                      {item.observacoes && (
                        <p className="text-[10px] text-muted-foreground italic">"{item.observacoes}"</p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums whitespace-nowrap">
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
