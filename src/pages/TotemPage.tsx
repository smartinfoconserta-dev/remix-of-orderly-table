import { useCallback, useEffect, useRef, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { getSistemaConfig } from "@/lib/adminStorage";
import { CheckCircle2 } from "lucide-react";

const TOTEM_MESA_ID = "__totem__";
const AUTO_RESET_MS = 10_000;

const TotemPage = () => {
  const { mesas } = useRestaurant();
  const [pedidoConfirmado, setPedidoConfirmado] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = getSistemaConfig();

  // Find latest pedido number for totem mesa
  const totemMesa = mesas.find((m) => m.id === TOTEM_MESA_ID);

  const resetTotem = useCallback(() => {
    setPedidoConfirmado(null);
  }, []);

  // Auto-reset after success
  useEffect(() => {
    if (pedidoConfirmado === null) return;
    timerRef.current = setTimeout(resetTotem, AUTO_RESET_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pedidoConfirmado, resetTotem]);

  // Listen for new pedidos on totem mesa
  useEffect(() => {
    if (!totemMesa) return;
    const lastPedido = totemMesa.pedidos[totemMesa.pedidos.length - 1];
    if (lastPedido && pedidoConfirmado === null) {
      // This will be triggered by PedidoFlow's confirmarPedido
    }
  }, [totemMesa, pedidoConfirmado]);

  // Success screen
  if (pedidoConfirmado !== null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-500">
          <CheckCircle2 className="h-24 w-24 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-4xl font-black text-foreground">Pedido realizado!</h1>
          <p className="text-6xl font-black text-primary">#{pedidoConfirmado}</p>
          <p className="text-lg text-muted-foreground mt-2">
            Retire quando aparecer na tela
          </p>
        </div>
        <div className="mt-8">
          <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                animation: `shrink ${AUTO_RESET_MS}ms linear forwards`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Voltando ao cardápio automaticamente...
          </p>
        </div>
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PedidoFlow
        modo="totem"
        mesaId={TOTEM_MESA_ID}
        onPedidoConfirmado={() => {
          // Get latest pedido number
          const mesa = mesas.find((m) => m.id === TOTEM_MESA_ID);
          const lastPedido = mesa?.pedidos[mesa.pedidos.length - 1];
          setPedidoConfirmado(lastPedido?.numeroPedido ?? 0);
        }}
      />
    </div>
  );
};

export default TotemPage;
