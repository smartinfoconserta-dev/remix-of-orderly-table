import { Bell, Receipt, ShoppingBag, ShoppingCart } from "lucide-react";
import type { Mesa } from "@/contexts/RestaurantContext";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

interface Props {
  mesa: Mesa;
  onClick: () => void;
  showTotal?: boolean;
  showIndicators?: boolean;
  timeLabel?: string;
  subtle?: boolean;
}

const MesaCard = ({ mesa, onClick, showTotal = true, showIndicators = true, timeLabel, subtle }: Props) => {
  const { status, chamarGarcom, carrinho, pedidos, total } = mesa;
  const hasParaViagem = pedidos.some((p) => p.paraViagem === true);

  const toneClass = chamarGarcom
    ? "border-destructive/45 bg-destructive/5"
    : status === "pendente"
      ? "border-[#dc2626]/50 bg-[#1f0a0a] animate-[pulse_2s_ease-in-out_infinite]"
      : status === "consumo"
        ? "border-[#16a34a]/50 bg-[#0d2218]"
        : subtle
          ? "border-border/30 bg-secondary/15 opacity-60"
          : "border-border/50 bg-secondary/30";

  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-[136px] flex-col items-center justify-center gap-2 rounded-xl border p-5 text-center mesa-card-interactive ${toneClass}`}
    >
      {chamarGarcom && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground">
          <Bell className="h-3.5 w-3.5" />
        </span>
      )}

      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Mesa
      </span>
      <span className="text-3xl font-black tabular-nums text-foreground md:text-4xl">
        {String(mesa.numero).padStart(2, "0")}
      </span>

      <StatusLabel status={status} chamarGarcom={chamarGarcom} />

      {timeLabel && (
        <span className="text-[10px] font-bold tabular-nums text-status-consumo">
          {timeLabel}
        </span>
      )}

      {showIndicators && (
        <div className="mt-1 flex items-center gap-3">
          {carrinho.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-status-pendente">
              <ShoppingCart className="h-3 w-3" />
              {carrinho.length}
            </span>
          )}
          {pedidos.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-status-consumo">
              <Receipt className="h-3 w-3" />
              {pedidos.length}
            </span>
          )}
        </div>
      )}

      {showTotal && (
        <span className="mt-1 text-sm font-black tabular-nums text-foreground">
          {formatPrice(total)}
        </span>
      )}
    </button>
  );
};

const StatusLabel = ({ status, chamarGarcom }: { status: string; chamarGarcom: boolean }) => {
  if (chamarGarcom) {
    return (
      <span className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
        Chamando
      </span>
    );
  }

  const config: Record<string, { label: string; className: string }> = {
    livre: {
      label: "Livre",
      className: "border-border bg-secondary text-muted-foreground",
    },
    pendente: {
      label: "Pendente",
      className: "border-status-pendente/25 bg-status-pendente/10 text-status-pendente",
    },
    consumo: {
      label: "Em consumo",
      className: "border-status-consumo/25 bg-status-consumo/10 text-status-consumo",
    },
  };

  const { label, className } = config[status] ?? config.livre;

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${className}`}>
      {label}
    </span>
  );
};

export default MesaCard;
