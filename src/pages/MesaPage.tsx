import { useParams } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";

const MesaPage = () => {
  const { id } = useParams<{ id: string }>();
  const { getMesa } = useRestaurant();
  const mesa = getMesa(id || "");

  if (!mesa) {
    return (
      <AppLayout title="Mesa não encontrada" showBack>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Mesa não encontrada.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Mesa ${String(mesa.numero).padStart(2, "0")}`} showBack>
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        {/* Status Card */}
        <div className="surface-card p-6 flex flex-col items-center gap-4">
          <span className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold">
            Status
          </span>
          <StatusBadge status={mesa.status} />
        </div>

        {/* Resumo */}
        <div className="surface-card p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">Total</span>
            <span className="text-foreground text-2xl font-black tabular-nums">
              R$ {mesa.total.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">Pedidos</span>
            <span className="text-foreground text-lg font-bold tabular-nums">
              {mesa.pedidos.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm font-medium">Itens no carrinho</span>
            <span className="text-foreground text-lg font-bold tabular-nums">
              {mesa.carrinho.length}
            </span>
          </div>
        </div>

        {/* Placeholder actions */}
        <p className="text-muted-foreground text-xs text-center">
          Ações de pedido serão implementadas aqui.
        </p>
      </div>
    </AppLayout>
  );
};

export default MesaPage;
