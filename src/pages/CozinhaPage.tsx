import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChefHat, Clock, User } from "lucide-react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import type { PedidoRealizado } from "@/contexts/RestaurantContext";

/* ── helpers ── */
const minutesAgo = (isoDate: string) => {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / 60_000));
};

const MAX_ELAPSED_MINUTES = 600;

const formatElapsed = (mins: number) => {
  if (mins > MAX_ELAPSED_MINUTES) return "tempo indisponível";
  if (mins < 1) return "agora";
  if (mins === 1) return "há 1 min";
  return `há ${mins} min`;
};

const formatTime = (d: Date) =>
  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const origemLabel = (origem: string) =>
  origem === "garcom" ? "Garçom" : origem === "caixa" ? "Caixa" : "Cliente";

const CozinhaPage = () => {
  const { mesas, marcarPedidoPronto } = useRestaurant();
  const [, setTick] = useState(0);
  const [clock, setClock] = useState(() => formatTime(new Date()));

  /* tick every 30s to refresh elapsed times */
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setClock(formatTime(new Date()));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  /* collect all active (not pronto) orders from non-livre tables */
  const activePedidos = useMemo(() => {
    const all: (PedidoRealizado & { mesaNumero: number })[] = [];
    for (const mesa of mesas) {
      if (mesa.status === "livre") continue;
      for (const pedido of mesa.pedidos) {
        if (!pedido.pronto) {
          all.push({ ...pedido, mesaNumero: mesa.numero });
        }
      }
    }
    /* oldest first */
    all.sort((a, b) => new Date(a.criadoEmIso).getTime() - new Date(b.criadoEmIso).getTime());
    return all;
  }, [mesas]);

  const handlePronto = useCallback(
    (mesaId: string, pedidoId: string) => {
      marcarPedidoPronto(mesaId, pedidoId);
    },
    [marcarPedidoPronto],
  );

  return (
    <div className="min-h-svh bg-background p-4 md:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ChefHat className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-black text-foreground">Cozinha</h1>
          <p className="text-xs text-muted-foreground">
            {activePedidos.length === 0
              ? "Nenhum pedido pendente"
              : `${activePedidos.length} pedido${activePedidos.length > 1 ? "s" : ""} ativo${activePedidos.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <span className="text-xl font-black tabular-nums text-foreground">{clock}</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-status-consumo ml-2">
          <span className="h-1.5 w-1.5 rounded-full bg-status-consumo animate-pulse" />
          Ao vivo
        </span>
      </div>

      {/* Empty state */}
      {activePedidos.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-muted-foreground">
          <ChefHat className="h-16 w-16 opacity-15" />
          <p className="text-base font-bold">Nenhum pedido na fila</p>
          <p className="text-sm">Os pedidos aparecerão aqui automaticamente.</p>
        </div>
      )}

      {/* Order grid — auto-fill responsive */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {activePedidos.map((pedido) => {
          const mins = minutesAgo(pedido.criadoEmIso);
          const isLate = mins >= 15 && mins <= MAX_ELAPSED_MINUTES;

          return (
            <div
              key={pedido.id}
              className={`flex flex-col rounded-2xl border bg-card transition-all ${
                isLate
                  ? "border-destructive/60 animate-pulse shadow-[0_0_20px_hsl(var(--destructive)/0.2)]"
                  : "border-border"
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-2xl font-black text-foreground leading-none">
                    Mesa {String(pedido.mesaNumero).padStart(2, "0")}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      #{pedido.numeroPedido}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-2.5 w-2.5" />
                      {origemLabel(pedido.origem)}
                    </span>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold ${
                    isLate
                      ? "bg-destructive/15 text-destructive"
                      : mins >= 8
                        ? "bg-primary/15 text-primary"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {formatElapsed(mins)}
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 space-y-1.5 p-4">
                {pedido.itens.map((item) => (
                  <div key={item.uid} className="flex items-start gap-2">
                    <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-black tabular-nums text-foreground">
                      {item.quantidade}×
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground leading-snug">{item.nome}</p>
                      {item.adicionais.length > 0 && (
                        <p className="text-xs text-primary mt-0.5">
                          + {item.adicionais.map((a) => a.nome).join(", ")}
                        </p>
                      )}
                      {item.removidos.length > 0 && (
                        <p className="text-xs text-destructive mt-0.5">Sem {item.removidos.join(", ")}</p>
                      )}
                      {item.observacoes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{item.observacoes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pronto button */}
              <div className="p-3 pt-0">
                <button
                  type="button"
                  onClick={() => handlePronto(pedido.mesaId, pedido.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-status-consumo py-3.5 text-sm font-black text-white transition-all hover:bg-status-consumo/90 active:scale-[0.98]"
                >
                  <Check className="h-4 w-4" />
                  Marcar como pronto
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CozinhaPage;
