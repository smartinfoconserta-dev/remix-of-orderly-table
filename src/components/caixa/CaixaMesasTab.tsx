import { ShoppingBag, Wallet } from "lucide-react";
import MesaCard from "@/components/MesaCard";
import { formatPrice } from "./caixaHelpers";
import type { Mesa } from "@/types/restaurant";

interface PedidoBalcao {
  id: string;
  numeroPedido: number;
  clienteNome?: string;
  total: number;
  statusBalcao?: string;
  origem: string;
  itens: any[];
  motoboyNome?: string;
  paraViagem?: boolean;
}

interface CaixaMesasTabProps {
  mesas: Mesa[];
  pedidosBalcaoSoAtivos: PedidoBalcao[];
  onSelectMesa: (mesaId: string) => void;
  onSelectBalcao: (pedidoId: string) => void;
  currentTime: Date;
}

const CaixaMesasTab = ({
  mesas,
  pedidosBalcaoSoAtivos,
  onSelectMesa,
  onSelectBalcao,
  currentTime,
}: CaixaMesasTabProps) => {
  const getMesaTimeLabel = (m: Mesa): string | undefined => {
    if (m.status !== "consumo" || m.pedidos.length === 0) return undefined;
    const earliest = m.pedidos.reduce((min: number, p: any) => {
      const t = new Date(p.criadoEmIso).getTime();
      return t < min ? t : min;
    }, Infinity);
    const mins = Math.floor((currentTime.getTime() - earliest) / 60000);
    if (mins < 1) return "< 1min";
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m2 = mins % 60;
    return m2 > 0 ? `${h}h${String(m2).padStart(2, "0")}` : `${h}h`;
  };

  const getMesaTimeColor = (m: Mesa): "green" | "amber" | "red" | undefined => {
    if (m.status !== "consumo" || m.pedidos.length === 0) return undefined;
    const earliest = m.pedidos.reduce((min: number, p: any) => {
      const t = new Date(p.criadoEmIso).getTime();
      return t < min ? t : min;
    }, Infinity);
    const mins = Math.floor((currentTime.getTime() - earliest) / 60000);
    if (mins >= 60) return "red";
    if (mins >= 30) return "amber";
    return "green";
  };

  return (
    <div
      className="grid gap-3 fade-in"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
    >
      {mesas.map((item, i) => (
        <div
          key={item.id}
          className="slide-up"
          style={{
            animationDelay: `${Math.min(i * 30, 300)}ms`,
            animationFillMode: "both",
          }}
        >
          <MesaCard
            mesa={item}
            onClick={() => onSelectMesa(item.id)}
            showTotal
            timeLabel={getMesaTimeLabel(item)}
            timeColor={getMesaTimeColor(item)}
            subtle={item.status === "livre"}
          />
        </div>
      ))}

      {/* ── Balcão cards ── */}
      {pedidosBalcaoSoAtivos.map((pb) => {
        const isPronto = pb.statusBalcao === "pronto";
        const isRetirado = pb.statusBalcao === "retirado";
        const isPreparando = pb.statusBalcao === "preparando";
        return (
          <div
            key={pb.id}
            className={`slide-up ${
              pb.statusBalcao === "cancelado" || isRetirado ? "opacity-50" : ""
            }`}
          >
            <button
              onClick={() =>
                pb.statusBalcao !== "cancelado" &&
                !isRetirado &&
                onSelectBalcao(pb.id)
              }
              className={`relative flex min-h-[136px] w-full flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center mesa-card-interactive ${
                pb.statusBalcao === "cancelado"
                  ? "border-red-500/30 bg-red-500/5 cursor-not-allowed"
                  : isRetirado
                    ? "border-border bg-secondary/30 cursor-not-allowed"
                    : isPronto
                      ? "border-status-consumo/50 bg-status-consumo/8 animate-pulse"
                      : isPreparando
                        ? "border-amber-500/50 bg-amber-500/8"
                        : "border-amber-500/50 bg-amber-500/8"
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                  pb.origem === "totem"
                    ? "text-orange-400"
                    : "text-muted-foreground"
                }`}
              >
                {pb.origem === "totem" ? "Totem" : "Balcão"}
              </span>
              <span
                className={`text-sm font-black truncate max-w-full px-1 ${
                  pb.statusBalcao === "cancelado"
                    ? "line-through text-red-400"
                    : "text-foreground"
                }`}
              >
                {pb.clienteNome || "—"}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  pb.statusBalcao === "cancelado"
                    ? "border-red-500/25 bg-red-500/10 text-red-400"
                    : isRetirado
                      ? "border-border bg-muted text-muted-foreground"
                      : isPronto
                        ? "border-status-consumo/25 bg-status-consumo/10 text-status-consumo animate-pulse"
                        : isPreparando
                          ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-400"
                }`}
              >
                {pb.statusBalcao === "cancelado"
                  ? "Cancelado"
                  : isRetirado
                    ? "Retirado"
                    : isPronto
                      ? "Pronto"
                      : isPreparando
                        ? "Preparando"
                        : pb.statusBalcao === "pago"
                          ? "Pago"
                          : "Aberto"}
              </span>
              {(pb as any).paraViagem === true && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400">
                  <ShoppingBag className="h-2.5 w-2.5" />
                  Para levar
                </span>
              )}
              <span
                className={`mt-1 text-sm font-black tabular-nums ${
                  pb.statusBalcao === "cancelado"
                    ? "line-through text-red-400"
                    : "text-foreground"
                }`}
              >
                {formatPrice(pb.total)}
              </span>
            </button>
            {isPronto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBalcao(pb.id);
                }}
                className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-black text-white transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                <Wallet className="h-3.5 w-3.5" />
                Cobrar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CaixaMesasTab;
