import { Bell, ShoppingCart, Receipt } from "lucide-react";
import type { Mesa } from "@/contexts/RestaurantContext";

const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

interface Props {
  mesa: Mesa;
  onClick: () => void;
  showTotal?: boolean;
}

const MesaCard = ({ mesa, onClick, showTotal }: Props) => {
  const { status, chamarGarcom, carrinho, pedidos, total } = mesa;

  // Priority: chamarGarcom > pendente > consumo > livre
  const borderClass = chamarGarcom
    ? "border-destructive/60 animate-pulse"
    : status === "pendente"
    ? "border-status-pendente/40"
    : status === "consumo"
    ? "border-status-livre/30"
    : "border-border";

  const bgClass = chamarGarcom
    ? "bg-destructive/5"
    : status === "pendente"
    ? "bg-status-pendente/5"
    : status === "consumo"
    ? "bg-status-livre/5"
    : "bg-card";

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-2 p-5 md:p-6 min-h-[130px] md:min-h-[150px] rounded-xl border ${borderClass} ${bgClass} transition-all active:scale-[0.97]`}
    >
      {/* Chamar garçom alert */}
      {chamarGarcom && (
        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center">
          <Bell className="w-3.5 h-3.5" />
        </span>
      )}

      {/* Mesa number */}
      <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">
        Mesa
      </span>
      <span className="text-foreground text-3xl md:text-4xl font-black tabular-nums">
        {String(mesa.numero).padStart(2, "0")}
      </span>

      {/* Status label */}
      <StatusLabel status={status} chamarGarcom={chamarGarcom} />

      {/* Info indicators */}
      <div className="flex items-center gap-3 mt-1">
        {carrinho.length > 0 && (
          <span className="flex items-center gap-1 text-status-pendente text-[10px] font-semibold">
            <ShoppingCart className="w-3 h-3" />
            {carrinho.length}
          </span>
        )}
        {pedidos.length > 0 && (
          <span className="flex items-center gap-1 text-status-livre text-[10px] font-semibold">
            <Receipt className="w-3 h-3" />
            {pedidos.length}
          </span>
        )}
      </div>

      {/* Total */}
      {showTotal && (
        <span className="text-primary text-sm font-black tabular-nums mt-0.5">
          {formatPrice(total)}
        </span>
      )}

    </button>
  );
};

const StatusLabel = ({ status, chamarGarcom }: { status: string; chamarGarcom: boolean }) => {
  if (chamarGarcom) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">
        Chamando
      </span>
    );
  }

  const config: Record<string, { label: string; colorClass: string }> = {
    livre: { label: "Livre", colorClass: "text-muted-foreground" },
    pendente: { label: "Pendente", colorClass: "text-status-pendente" },
    consumo: { label: "Em consumo", colorClass: "text-status-livre" },
  };

  const { label, colorClass } = config[status] ?? config.livre;

  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest ${colorClass}`}>
      {label}
    </span>
  );
};

export default MesaCard;
